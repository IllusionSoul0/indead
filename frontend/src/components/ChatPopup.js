import { useState, useEffect, useRef } from "react";
import { socket } from "../socket";
import "./ChatPopup.css";
import { MAX_CHAT_EMAIL_LENGTH, MAX_MESSAGE_LENGTH, sanitize, validateLength } from "../utils/validation";

export default function ChatPopup({ user }) {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newChatEmail, setNewChatEmail] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function getConversations() {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/messages/conversations`, { credentials: "include" });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch conversations");

        setConversations(data.conversations);
        if (data.conversations.length) {
          const firstActiveConversation = data.conversations.find((c) => c.last_message_content);
          if (firstActiveConversation) setSelectedUserId(firstActiveConversation.user_id);
        }
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    }

    getConversations();

    const handleMessage = (msg) => {
      const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;

      setSelectedUserId((prevSelectedUserId) => {
        const newSelected = prevSelectedUserId || otherUserId;

        setMessages((prev) => {
          if (!prevSelectedUserId || prevSelectedUserId === otherUserId) {
            return [...prev, msg];
          }
          return prev;
        });

        setConversations((prev) =>
          prev
            .map((a) => {
              if (a.user_id === otherUserId) {
                return {
                  ...a,
                  last_message_content: msg.content,
                  last_message_sender_id: msg.sender_id,
                  last_message_time: Date.now(),
                  unread_count: !prevSelectedUserId || prevSelectedUserId === otherUserId ? 0 : (Number(a.unread_count) || 0) + 1,
                };
              }
              return a;
            })
            .sort((a, b) => (b.last_message_time || 0) - (a.last_message_time || 0)),
        );

        return newSelected;
      });
    };

    socket.on("message:receive", handleMessage);
    return () => socket.off("message:receive", handleMessage);
  }, [user]);

  useEffect(() => {
    if (!selectedUserId) return;
    async function getMessages() {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/messages/${selectedUserId}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setMessages(data.messages);
        setConversations((prev) => prev.map((a) => (a.user_id === selectedUserId ? { ...a, unread_count: 0 } : a)));
      } catch (error) {
        alert(error);
      }
    }
    getMessages();
  }, [selectedUserId]);

  useEffect(() => {
    if (!newChatEmail) {
      setSuggestions([]);
      return;
    }
    if (!validateLength(newChatEmail, MAX_CHAT_EMAIL_LENGTH)) {
      setSuggestions([]);
      return;
    }

    if (conversations.some((c) => c.user_email === newChatEmail.toLowerCase())) {
      setSuggestions([]);
      return;
    }

    const safeInput = sanitize(newChatEmail.toLowerCase());
    const filtered = conversations.map((c) => c.user_email).filter((email) => email.includes(safeInput) && email !== user.email);

    setSuggestions(filtered);
  }, [newChatEmail, conversations, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();

    if (newMessage.trim() === "") return;
    if (!validateLength(newMessage, MAX_MESSAGE_LENGTH)) {
      alert(`Message too long (max ${MAX_MESSAGE_LENGTH})`);
      return;
    }
    const safe = sanitize(newMessage.trim());
    socket.emit("message:send", { recipientId: selectedUserId, content: safe });
    setNewMessage("");
  }

  async function readAll() {
    await fetch(`${process.env.REACT_APP_API_URL}/messages/readAll`, {
      method: "PUT",
      credentials: "include",
    });
    setConversations((prev) => prev.map((a) => ({ ...a, unread_count: 0 })));
  }

  function createNewChat(e, email) {
    e.preventDefault();
    const safeEmail = sanitize((email || newChatEmail).trim().toLowerCase());
    const conversation = conversations.find((a) => a.user_email === safeEmail);
    if (!safeEmail || !conversation) return;
    if (conversation.last_message_content) {
      setSelectedUserId(conversation.user_id);
      setNewChatEmail("");
      setSuggestions([]);
      return;
    }

    setConversations((prev) => prev.map((a) => (a.user_email === safeEmail ? { ...a, last_message_content: "New Conversation" } : a)));
    setSelectedUserId(conversations.find((a) => a.user_email === safeEmail).user_id);
    setNewChatEmail("");
    setSuggestions([]);
  }

  return (
    <div className="chat-popup">
      <div className="chat-sidebar">
        <div>
          <button onClick={readAll}>Read All</button>

          <form onSubmit={createNewChat} className="new-chat-form">
            <div className="new-chat-input-wrapper">
              <input type="text" placeholder="New chat" value={newChatEmail} onChange={(e) => setNewChatEmail(e.target.value)} maxLength={MAX_CHAT_EMAIL_LENGTH} />

              {newChatEmail && (
                <button
                  type="button"
                  className="clear-input-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNewChatEmail("");
                  }}
                >
                  ×
                </button>
              )}

              {suggestions.length > 0 && (
                <ul className="chat-suggestion-list">
                  {suggestions.map((email) => (
                    <li
                      key={email}
                      className="chat-suggestion-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        createNewChat(e, email);
                      }}
                    >
                      {email}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button type="submit" className="new-chat-send-btn">
              <img src="https://www.svgrepo.com/show/535153/arrow-right.svg" alt="arrow_icon" />
            </button>
          </form>
        </div>

        {conversations.map((c) => {
          if (!c.last_message_content) return null;
          const isSel = c.user_id === selectedUserId;

          return (
            <div key={c.user_id} onClick={() => setSelectedUserId(c.user_id)} className={"chat-suggestion-item" + (isSel ? " selected" : "")}>
              <p>{c.user_email}</p>
              <p>
                {c.last_message_sender_id ? (c.last_message_sender_id === c.user_id ? "Them: " : "You: ") : ""}
                {c.last_message_content}
              </p>

              {c.unread_count > 0 && <span className="unread-badge">{c.unread_count}</span>}
            </div>
          );
        })}
      </div>

      <div className="chat-main">
        <div className="chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={"chat-message " + (m.sender_id === user.id ? "self" : "other")}>
              {m.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-input">
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
