import os
import random
import string
import json
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
socketio = SocketIO(app, async_mode='threading', logger=True, engineio_logger=True)

# ============ 游戏配置 ============
CARDS = {
    "dumpling": {"name": "Dumpling", "icon": "🥟", "effect": "luck+1", "desc": "Gain 1 Luck Point"},
    "panda": {"name": "Panda", "icon": "🐼", "effect": "peek", "desc": "Peek at one player's hand"},
    "red_envelope": {"name": "Red Envelope", "icon": "🧧", "effect": "draw2", "desc": "Draw 2 cards"},
    "great_wall": {"name": "Great Wall", "icon": "🏯", "effect": "shield", "desc": "Block one negative effect"},
    "dragon_dance": {"name": "Dragon Dance", "icon": "🐉", "effect": "quiz_all", "desc": "Everyone answers a quiz"},
    "lantern": {"name": "Lantern", "icon": "🏮", "effect": "progress", "desc": "Check current progress"},
    "chopsticks": {"name": "Chopsticks", "icon": "🥢", "effect": "swap", "desc": "Swap hands with one player"},
    "culture_quiz": {"name": "Culture Quiz", "icon": "❓", "effect": "quiz", "desc": "Answer a culture question"}
}

WINNING_LUCK = 9
MAX_PLAYERS = 12
MIN_PLAYERS = 2
TURN_TIME_LIMIT = 30

# ============ 游戏状态 ============
rooms_data = {}
player_rooms = {}

# 加载题库
with open('data/questions.json', 'r', encoding='utf-8') as f:
    QUESTIONS = json.load(f)

# ============ 辅助函数 ============
def generate_room_code():
    """生成5位房间码"""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        if code not in rooms_data:
            return code

def create_deck(num_players=2):
    """根据人数创建游戏牌组"""
    base_counts = {
        "dumpling": 12,  # 增加直接获得幸运值的卡牌数量
        "panda": 4,
        "red_envelope": 6,
        "great_wall": 4,
        "dragon_dance": 3,
        "lantern": 5,
        "chopsticks": 4,
        "culture_quiz": 8  # 增加直接获得幸运值的卡牌数量
    }
    
    # 根据人数分档调整牌堆数量
    # 2-3人：1倍（40张）
    # 4-6人：2倍（80张）
    # 7-12人：3倍（120张）
    if num_players <= 3:
        multiplier = 1
    elif num_players <= 6:
        multiplier = 2
    else:
        multiplier = 3
    
    deck = []
    for card_type, count in base_counts.items():
        deck.extend([card_type] * (count * multiplier))
    random.shuffle(deck)
    print(f'[create_deck] Created deck for {num_players} players with {multiplier}x multiplier, total cards: {len(deck)}')
    return deck

def deal_cards(deck, num_players):
    """发牌，每人5张"""
    hands = [[] for _ in range(num_players)]
    for _ in range(5):
        for i in range(num_players):
            if deck:
                hands[i].append(deck.pop())
    return hands, deck

def get_next_player(room_data, current_idx):
    """获取下一个玩家索引"""
    num_players = len(room_data['players'])
    return (current_idx + 1) % num_players

# ============ 路由 ============
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/room/<room_code>')
def room(room_code):
    return render_template('room.html', room_code=room_code)

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

# ============ Socket.IO 事件 ============
@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('test')
def handle_test(data):
    print(f'[test] Received: {data}')
    emit('test_response', {'message': 'ok'})

@socketio.on('reconnect_room')
def handle_reconnect_room(data):
    """玩家重新连接到房间（从房间页面加载时调用）"""
    room_code = data.get('room_code', '').upper().strip()
    player_name = data.get('player_name', '').strip()
    previous_sid = data.get('previous_sid', '')

    print(f'[reconnect_room] room_code={room_code}, player_name={player_name}, previous_sid={previous_sid}, current_sid={request.sid}')
    print(f'[reconnect_room] Current rooms_data keys: {list(rooms_data.keys())}')

    if not room_code or not player_name:
        emit('error', {'message': 'Missing room info'})
        return

    if room_code not in rooms_data:
        print(f'[reconnect_room] Room not found: {room_code}')
        emit('error', {'message': 'Room not found'})
        return

    room = rooms_data[room_code]
    print(f'[reconnect_room] Found room: {room_code}, players: {[p["name"] for p in room["players"]]}')

    # 查找是否有匹配的玩家（根据名字，忽略大小写）
    player = None
    for p in room['players']:
        print(f'[reconnect_room] Checking player: {p["name"]} (sid: {p["sid"]})')
        if p['name'].lower() == player_name.lower():
            player = p
            break

    if not player:
        print(f'[reconnect_room] Player not found, trying to join...')
        # 找不到玩家，尝试作为新玩家加入（如果房间存在且在等待状态）
        if room['status'] == 'waiting':
            print(f'[reconnect_room] Room is waiting, calling handle_player_join_room')
            # 作为新玩家加入时，如果是第一个玩家，设置为房主
            result = handle_player_join_room({
                'room_code': room_code,
                'player_name': player_name
            })
            # 如果房间中只有一个玩家，设置为房主
            if len(room['players']) == 1:
                room['host'] = request.sid
                print(f'[reconnect_room] Set host to new player: {request.sid}')
            return result
        else:
            emit('error', {'message': 'Player not found in room'})
            return

    # 清理旧的 sid 映射
    if player['sid'] in player_rooms:
        del player_rooms[player['sid']]

    # 更新为新的 sid
    old_sid = player['sid']
    player['sid'] = request.sid
    player_rooms[request.sid] = room_code

    # 检查是否是房主（在更新房主 sid 之前）
    is_host = room['host'] == old_sid
    
    # 如果是房主重新连接，更新房主 sid
    if is_host:
        room['host'] = request.sid
        print(f'[reconnect_room] Updated host sid from {old_sid} to {request.sid}')
    # 确保房间有房主
    elif not room.get('host') or room['host'] not in [p['sid'] for p in room['players']]:
        room['host'] = request.sid
        print(f'[reconnect_room] Set host to current player: {request.sid}')
        is_host = True

    print(f'[reconnect_room] Updated player sid from {old_sid} to {request.sid}, is_host={is_host}')
    print(f'[reconnect_room] Room host after update: {room["host"]}')

    # 加入房间
    join_room(room_code)

    emit('room_reconnected', {
        'room': room,
        'player': player,
        'is_host': is_host
    })
    emit('room_update', room, room=room_code)
    emit('chat_message', {
        'type': 'system',
        'message': f'{player_name} reconnected'
    }, room=room_code)

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    # 处理玩家离开
    if request.sid in player_rooms:
        room_code = player_rooms[request.sid]
        handle_player_leave(room_code, request.sid)

@socketio.on('create_room')
def handle_create_room(data):
    """创建房间"""
    print(f'[create_room] Received data: {data}')
    player_name = data.get('player_name', 'Player').strip()
    if not player_name:
        emit('error', {'message': 'Please enter your name'})
        return
    
    room_code = generate_room_code()
    rooms_data[room_code] = {
        'code': room_code,
        'players': [{
            'sid': request.sid,
            'name': player_name,
            'hand': [],
            'luck': 0,
            'shield': False,
            'index': 0
        }],
        'deck': [],
        'discard': [],
        'current_player': 0,
        'status': 'waiting',
        'chat': [],
        'host': request.sid
    }
    
    print(f'[create_room] Created room: {room_code}, players: [{player_name}], rooms_data keys: {list(rooms_data.keys())}')
    
    player_rooms[request.sid] = room_code
    join_room(room_code)
    
    emit('room_created', {
        'room_code': room_code,
        'player': rooms_data[room_code]['players'][0]
    })
    emit('room_update', rooms_data[room_code], room=room_code)
    print(f'[create_room] Emitted room_created event with room_code: {room_code}')

@socketio.on('player_join_room')
def handle_player_join_room(data):
    """加入房间"""
    print(f'[player_join_room] Received data: {data}')
    room_code = data.get('room_code', '').upper().strip()
    player_name = data.get('player_name', 'Player').strip()
    print(f'[player_join_room] room_code={room_code}, player_name={player_name}')
    print(f'[player_join_room] Current rooms_data keys: {list(rooms_data.keys())}')
    
    if not player_name:
        emit('error', {'message': 'Please enter your name'})
        return
    
    if room_code not in rooms_data:
        print(f'[player_join_room] Room not found: {room_code}')
        emit('error', {'message': 'Room not found'})
        return
    
    room = rooms_data[room_code]
    print(f'[player_join_room] Found room: {room_code}, players: {[p["name"] for p in room["players"]]}')
    
    if room['status'] != 'waiting':
        emit('error', {'message': 'Game already started'})
        return
    
    if len(room['players']) >= MAX_PLAYERS:
        emit('error', {'message': 'Room is full'})
        return
    
    # 检查是否重名
    existing_player = None
    for p in room['players']:
        print(f'[player_join_room] Checking player: {p["name"]} (sid: {p["sid"]})')
        if p['name'] == player_name:
            existing_player = p
            break

    if existing_player:
        # 如果 sid 不同，说明是同名玩家重新连接（房主跳转等情况），更新 sid
        if existing_player['sid'] != request.sid:
            print(f'[join_room] Player {player_name} reconnecting, updating sid from {existing_player["sid"]} to {request.sid}')
            # 清理旧 sid
            if existing_player['sid'] in player_rooms:
                del player_rooms[existing_player['sid']]
            # 更新为新 sid
            old_sid = existing_player['sid']
            existing_player['sid'] = request.sid
            player_rooms[request.sid] = room_code
            join_room(room_code)

            emit('room_joined', {
                'room_code': room_code,
                'player': existing_player,
                'room': room
            })
            emit('room_update', room, room=room_code)

            # 如果更新的是房主 sid
            if room['host'] == old_sid:
                room['host'] = request.sid

            return
        else:
            # sid 相同，说明是重复请求
            emit('error', {'message': 'You are already in this room'})
            return
    
    new_player = {
        'sid': request.sid,
        'name': player_name,
        'hand': [],
        'luck': 0,
        'shield': False,
        'index': len(room['players'])
    }
    room['players'].append(new_player)
    player_rooms[request.sid] = room_code
    join_room(room_code)

    emit('room_joined', {
        'room_code': room_code,
        'player': new_player,
        'room': room
    })
    emit('room_update', room, room=room_code)
    emit('chat_message', {
        'type': 'system',
        'message': f'{player_name} joined the room'
    }, room=room_code)

@socketio.on('leave_room')
def handle_leave_room():
    """主动离开房间"""
    if request.sid in player_rooms:
        room_code = player_rooms[request.sid]
        handle_player_leave(room_code, request.sid)

def handle_player_leave(room_code, sid):
    """处理玩家离开"""
    if room_code not in rooms_data:
        return
    
    room = rooms_data[room_code]
    player = None
    for p in room['players']:
        if p['sid'] == sid:
            player = p
            break
    
    if player:
        room['players'].remove(player)
        leave_room(room_code)
        if sid in player_rooms:
            del player_rooms[sid]
        
        # 只有当房间状态不是 waiting 或者玩家数量确实为 0 时才删除房间
        # 这样可以防止在创建房间后立即跳转到房间页面时房间被删除
        if len(room['players']) == 0 and room['status'] != 'waiting':
            print(f'[handle_player_leave] Deleting room {room_code} because no players left and game not waiting')
            del rooms_data[room_code]
        else:
            print(f'[handle_player_leave] Room {room_code} has {len(room["players"])} players left, status: {room["status"]}')
            # 重新分配索引
            for i, p in enumerate(room['players']):
                p['index'] = i
            # 如果离开的是房主，转移房主
            if room['host'] == sid and room['players']:
                room['host'] = room['players'][0]['sid']
            emit('room_update', room, room=room_code)
        
        emit('chat_message', {
            'type': 'system',
            'message': f'{player["name"]} left the room'
        }, room=room_code)

@socketio.on('start_game')
def handle_start_game():
    """开始游戏"""
    if request.sid not in player_rooms:
        emit('error', {'message': 'Not in a room'})
        return
    
    room_code = player_rooms[request.sid]
    room = rooms_data[room_code]
    
    if room['host'] != request.sid:
        emit('error', {'message': 'Only host can start the game'})
        return
    
    if len(room['players']) < MIN_PLAYERS:
        emit('error', {'message': f'Need at least {MIN_PLAYERS} players'})
        return
    
    # 初始化游戏
    room['status'] = 'playing'
    num_players = len(room['players'])
    room['deck'] = create_deck(num_players)
    hands, room['deck'] = deal_cards(room['deck'], num_players)
    
    for i, player in enumerate(room['players']):
        player['hand'] = hands[i]
        player['luck'] = 0
        player['shield'] = False
    
    room['current_player'] = 0
    room['discard'] = []
    
    emit('game_started', room, room=room_code)
    emit('chat_message', {
        'type': 'system',
        'message': 'Game started! Good luck!'
    }, room=room_code)

@socketio.on('play_card')
def handle_play_card(data):
    """出牌"""
    if request.sid not in player_rooms:
        return
    
    room_code = player_rooms[request.sid]
    room = rooms_data[room_code]
    
    if room['status'] != 'playing':
        emit('error', {'message': 'Game not in progress'})
        return
    
    # 找到当前玩家
    current_player = None
    for p in room['players']:
        if p['sid'] == request.sid:
            current_player = p
            break
    
    if not current_player or current_player['index'] != room['current_player']:
        emit('error', {'message': 'Not your turn'})
        return
    
    card_type = data.get('card_type')
    target_sid = data.get('target_sid')
    
    if card_type not in current_player['hand']:
        emit('error', {'message': 'Card not in hand'})
        return
    
    # 移除卡牌
    current_player['hand'].remove(card_type)
    room['discard'].append(card_type)
    
    # 处理卡牌效果
    result = process_card_effect(room, current_player, card_type, target_sid)
    
    # 检查胜利条件
    if current_player['luck'] >= WINNING_LUCK:
        room['status'] = 'ended'
        emit('game_ended', {
            'winner': current_player,
            'players': room['players']
        }, room=room_code)
        return
    
    # 下一回合
    room['current_player'] = get_next_player(room, room['current_player'])
    
    # 检查并重置牌堆：当牌堆为空但弃牌堆不为空时，将弃牌堆洗牌后作为新牌堆
    if not room['deck'] and room['discard']:
        # 将弃牌堆洗牌后作为新牌堆
        room['deck'] = room['discard']
        random.shuffle(room['deck'])
        room['discard'] = []
        print(f'[play_card] Deck reshuffled from discard pile, new deck size: {len(room["deck"])}')
    
    # 补充手牌
    if room['deck'] and len(current_player['hand']) < 5:
        current_player['hand'].append(room['deck'].pop())
    
    emit('card_played', {
        'player': current_player,
        'card_type': card_type,
        'result': result,
        'next_player': room['current_player']
    }, room=room_code)
    emit('room_update', room, room=room_code)

def process_card_effect(room, player, card_type, target_sid=None):
    """处理卡牌效果"""
    result = {'success': True, 'message': ''}
    
    if card_type == 'dumpling':
        player['luck'] += 1
        result['message'] = f"{player['name']} gained 1 Luck Point!"
        
    elif card_type == 'panda':
        if target_sid:
            target = next((p for p in room['players'] if p['sid'] == target_sid), None)
            if target:
                result['message'] = f"{player['name']} peeked at {target['name']}'s hand"
                result['peek_result'] = {
                    'target_name': target['name'],
                    'target_hand': target['hand']
                }
                # 只发给出牌玩家
                emit('peek_result', result['peek_result'], room=player['sid'])
    
    elif card_type == 'red_envelope':
        drawn = []
        for _ in range(2):
            if room['deck']:
                drawn.append(room['deck'].pop())
        player['hand'].extend(drawn)
        result['message'] = f"{player['name']} drew 2 cards!"
        
    elif card_type == 'great_wall':
        player['shield'] = True
        result['message'] = f"{player['name']} is now protected!"
        
    elif card_type == 'dragon_dance':
        result['message'] = "Everyone must answer a quiz!"
        result['quiz_all'] = True
        question = random.choice(QUESTIONS)
        emit('quiz_triggered', {
            'type': 'all',
            'question': question,
            'asker': player['name']
        }, room=room['code'])
        
    elif card_type == 'lantern':
        leader = max(room['players'], key=lambda p: p['luck'])
        result['message'] = f"Current leader: {leader['name']} with {leader['luck']} Luck Points"
        
    elif card_type == 'chopsticks':
        if target_sid:
            target = next((p for p in room['players'] if p['sid'] == target_sid), None)
            if target:
                player['hand'], target['hand'] = target['hand'], player['hand']
                result['message'] = f"{player['name']} swapped hands with {target['name']}!"
    
    elif card_type == 'culture_quiz':
        question = random.choice(QUESTIONS)
        result['message'] = f"{player['name']} must answer a question!"
        emit('quiz_triggered', {
            'type': 'single',
            'target_sid': player['sid'],
            'question': question
        }, room=room['code'])
    
    return result

@socketio.on('answer_quiz')
def handle_answer_quiz(data):
    """回答问题"""
    if request.sid not in player_rooms:
        return
    
    room_code = player_rooms[request.sid]
    room = rooms_data[room_code]
    
    answer = data.get('answer')
    question = data.get('question')
    
    is_correct = answer == question['ans']
    
    player = next((p for p in room['players'] if p['sid'] == request.sid), None)
    
    if is_correct and player:
        player['luck'] += 1
        result_msg = f"{player['name']} answered correctly! +1 Luck Point"
    else:
        correct_answer = question['a'][question['ans']]
        result_msg = f"Wrong! The correct answer was: {correct_answer}"
    
    emit('quiz_result', {
        'player_sid': request.sid,
        'player_name': player['name'] if player else '',
        'correct': is_correct,
        'message': result_msg,
        'explanation': question.get('note', '')
    }, room=room_code)
    
    # 检查胜利条件
    if player and player['luck'] >= WINNING_LUCK:
        room['status'] = 'ended'
        emit('game_ended', {
            'winner': player,
            'players': room['players']
        }, room=room_code)
    else:
        emit('room_update', room, room=room_code)

@socketio.on('send_message')
def handle_send_message(data):
    """发送聊天消息"""
    if request.sid not in player_rooms:
        return
    
    room_code = player_rooms[request.sid]
    room = rooms_data[room_code]
    
    player = next((p for p in room['players'] if p['sid'] == request.sid), None)
    if player:
        message = data.get('message', '').strip()
        if message:
            emit('chat_message', {
                'type': 'player',
                'player_name': player['name'],
                'message': message
            }, room=room_code)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
