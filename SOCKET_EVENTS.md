# Socket.IO Events Documentation

## Kết nối

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
    auth: {
        token: 'YOUR_JWT_TOKEN'
    }
});
```

## Events

### Client → Server

#### 1. `join_room`
Tham gia vào một phòng chat

**Payload:**
```javascript
socket.emit('join_room', {
    roomId: 'room_id_here'
});
```

**Response:**
```javascript
socket.on('joined_room', (data) => {
    console.log('Joined room:', data.roomId);
});
```

---

#### 2. `leave_room`
Rời khỏi phòng chat

**Payload:**
```javascript
socket.emit('leave_room', {
    roomId: 'room_id_here'
});
```

---

#### 3. `send_message`
Gửi tin nhắn

**Payload:**
```javascript
socket.emit('send_message', {
    roomId: 'room_id_here',
    message: 'Hello world!'
});
```

---

#### 4. `typing`
Thông báo đang gõ tin nhắn

**Payload:**
```javascript
// Bắt đầu typing
socket.emit('typing', {
    roomId: 'room_id_here',
    isTyping: true
});

// Kết thúc typing
socket.emit('typing', {
    roomId: 'room_id_here',
    isTyping: false
});
```

---

### Server → Client

#### 1. `new_message`
Nhận tin nhắn mới

**Listener:**
```javascript
socket.on('new_message', (data) => {
    console.log('New message:', data.message);
    // data.message = {
    //     _id: 'message_id',
    //     room_id: 'room_id',
    //     sender_id: {
    //         _id: 'user_id',
    //         name: 'User Name',
    //         email: 'user@example.com',
    //         avatar_url: 'url'
    //     },
    //     message: 'Message content',
    //     created_at: '2025-12-01T...',
    //     updated_at: '2025-12-01T...'
    // }
});
```

---

#### 2. `user_typing`
Nhận thông báo user đang typing

**Listener:**
```javascript
socket.on('user_typing', (data) => {
    console.log(`${data.userName} is typing:`, data.isTyping);
    // data = {
    //     userId: 'user_id',
    //     userName: 'User Name',
    //     isTyping: true/false
    // }
});
```

---

#### 3. `error`
Nhận thông báo lỗi

**Listener:**
```javascript
socket.on('error', (data) => {
    console.error('Socket error:', data.message);
});
```

---

## Example Usage (React)

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function Chat({ roomId, token }) {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [typing, setTyping] = useState({});

    useEffect(() => {
        // Kết nối socket
        const newSocket = io('http://localhost:5000', {
            auth: { token }
        });

        setSocket(newSocket);

        // Cleanup khi unmount
        return () => newSocket.close();
    }, [token]);

    useEffect(() => {
        if (!socket) return;

        // Join room
        socket.emit('join_room', { roomId });

        // Lắng nghe tin nhắn mới
        socket.on('new_message', (data) => {
            setMessages(prev => [...prev, data.message]);
        });

        // Lắng nghe typing
        socket.on('user_typing', (data) => {
            setTyping(prev => ({
                ...prev,
                [data.userId]: data.isTyping
            }));
        });

        // Cleanup
        return () => {
            socket.emit('leave_room', { roomId });
            socket.off('new_message');
            socket.off('user_typing');
        };
    }, [socket, roomId]);

    const sendMessage = () => {
        if (!inputMessage.trim()) return;

        socket.emit('send_message', {
            roomId,
            message: inputMessage
        });

        setInputMessage('');
    };

    const handleTyping = (isTyping) => {
        socket.emit('typing', {
            roomId,
            isTyping
        });
    };

    return (
        <div>
            <div className="messages">
                {messages.map(msg => (
                    <div key={msg._id}>
                        <strong>{msg.sender_id.name}:</strong> {msg.message}
                    </div>
                ))}
                {Object.entries(typing).map(([userId, isTyping]) => 
                    isTyping && <div key={userId}>User is typing...</div>
                )}
            </div>
            <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onFocus={() => handleTyping(true)}
                onBlur={() => handleTyping(false)}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
}
```

---

## Connection Error Handling

```javascript
socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    // Xử lý lỗi kết nối (token không hợp lệ, network issues, etc.)
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    // Xử lý khi mất kết nối
});
```
