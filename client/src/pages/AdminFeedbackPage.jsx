import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/apiServices';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDate } from '@/utils/helpers';
import { MessageSquare, Calendar, Users, MapPin, Send, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AdminFeedbackPage = () => {
  const [expandedEvents, setExpandedEvents] = useState({});
  const [messageInputs, setMessageInputs] = useState({});
  const [socket, setSocket] = useState(null);
  const messageEndRefs = useRef({});
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io(API_URL, {
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected');
      // Join user room for notifications
      if (user?.id) {
        socketInstance.emit('join-user', user.id);
      }
    });

    socketInstance.on('new-chat-message', ({ eventId }) => {
      console.log('📨 New chat message received:', eventId);
      // Invalidate queries to refresh messages
      queryClient.invalidateQueries(['admin-all-events']);
      
      // Auto-scroll to bottom if event is expanded
      if (expandedEvents[eventId]) {
        setTimeout(() => scrollToBottom(eventId), 100);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.id, expandedEvents]);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['admin-all-events'],
    queryFn: () => eventService.getAll(),
    refetchInterval: 10000, // Refetch every 10 seconds as backup
  });

  // Get events with any chat messages or admin comments (backward compatibility)
  const eventsWithMessages = (eventsData?.data || [])
    .filter(event => 
      (event.chatMessages && event.chatMessages.length > 0)  ||
      (event.adminComments && event.adminComments.length > 0)
    )
    .sort((a, b) => {
      // Sort by latest message
      const aLatest = a.chatMessages?.length > 0 
        ? new Date(a.chatMessages[a.chatMessages.length - 1].sentAt)
        : new Date(a.createdAt);
      const bLatest = b.chatMessages?.length > 0 
        ? new Date(b.chatMessages[b.chatMessages.length - 1].sentAt)
        : new Date(b.createdAt);
      return bLatest - aLatest;
    });

  const sendMessageMutation = useMutation({
    mutationFn: ({ eventId, message }) => eventService.sendChatMessage(eventId, message),
    onSuccess: (_, variables) => {
      toast.success('Message sent');
      setMessageInputs(prev => ({ ...prev, [variables.eventId]: '' }));
      queryClient.invalidateQueries(['admin-all-events']);
      setTimeout(() => scrollToBottom(variables.eventId), 100);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send message');
    },
  });

  const toggleEvent = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
    
    // Join socket room for this event
    if (!expandedEvents[eventId] && socket) {
      socket.emit('join-event', eventId);
    } else if (socket) {
      socket.emit('leave-event', eventId);
    }
    
    // Scroll to bottom when expanding
    if (!expandedEvents[eventId]) {
      setTimeout(() => scrollToBottom(eventId), 100);
    }
  };

  const scrollToBottom = (eventId) => {
    messageEndRefs.current[eventId]?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (eventId) => {
    const message = messageInputs[eventId]?.trim();
    if (!message) return;
    
    sendMessageMutation.mutate({ eventId, message });
  };

  const handleKeyPress = (e, eventId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(eventId);
    }
  };

  // Merge chat messages and old admin comments for backward compatibility
  const getAllMessages = (event) => {
    const messages = [];
    
    // Add new chat messages
    if (event.chatMessages && event.chatMessages.length > 0) {
      event.chatMessages.forEach(msg => {
        messages.push({
          id: msg._id,
          message: msg.message,
          sender: msg.sender,
          senderRole: msg.senderRole,
          sentAt: msg.sentAt,
          type: 'chat',
        });
      });
    }
    
    // Add old admin comments (backward compatibility)
    if (event.adminComments && event.adminComments.length > 0) {
      event.adminComments.forEach(comment => {
        messages.push({
          id: comment._id,
          message: comment.comment,
          sender: comment.commentedBy,
          senderRole: 'admin',
          sentAt: comment.commentedAt,
          type: 'comment',
        });
        
        // Add replies as planner messages
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.forEach(reply => {
            messages.push({
              id: reply._id,
              message: reply.reply,
              sender: reply.repliedBy,
              senderRole: 'planner',
              sentAt: reply.repliedAt,
              type: 'reply',
            });
          });
        }
      });
    }
    
    // Sort by date
    return messages.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  };

  const getTotalMessageCount = (event) => {
    let count = 0;
    if (event.chatMessages) count += event.chatMessages.length;
    if (event.adminComments) {
      count += event.adminComments.length;
      event.adminComments.forEach(comment => {
        if (comment.replies) count += comment.replies.length;
      });
    }
    return count;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Event Feedback Conversations</h1>
        <p className="text-gray-600 mt-1">Continuous chat with planners about their events</p>
      </div>

      {eventsWithMessages.length === 0 ? (
        <div className="card text-center py-12">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Conversations Yet</h3>
          <p className="text-gray-600">Start a conversation from the "All Events" page.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {eventsWithMessages.map((event) => {
            const messages = getAllMessages(event);
            const messageCount = getTotalMessageCount(event);
            
            return (
              <div key={event._id} className="card overflow-hidden">
                {/* Event Header */}
                <button
                  onClick={() => toggleEvent(event._id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-t-lg transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{event.name}</h3>
                        <span className={`badge text-xs font-medium ${
                          event.status === 'rfp-published' ? 'bg-blue-100 text-blue-800' :
                          event.status === 'reviewing-proposals' ? 'bg-purple-100 text-purple-800' :
                          event.status === 'active' ? 'bg-green-100 text-green-800' :
                          event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(event.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location?.city}, {event.location?.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{event.expectedGuests} guests</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-700">
                          <strong>Planner:</strong> {event.planner?.name} ({event.planner?.email})
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        <MessageSquare className="h-4 w-4" />
                        {messageCount} message{messageCount !== 1 ? 's' : ''}
                      </div>
                      {expandedEvents[event._id] ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Chat Messages */}
                {expandedEvents[event._id] && (
                  <div className="border-t border-gray-200">
                    {/* Messages Container */}
                    <div className="bg-gray-50 p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-3">
                        {messages.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">
                            <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p>No messages yet. Start the conversation!</p>
                          </div>
                        ) : (
                          messages.map((msg, idx) => {
                            const isAdmin = msg.senderRole === 'admin';
                            const isCurrentUser = msg.sender?._id === user?.id;
                            
                            return (
                              <div
                                key={`${msg.id}-${idx}`}
                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      isAdmin ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-teal-600'
                                    }`}>
                                      <span className="text-white text-xs font-semibold">
                                        {msg.sender?.name?.charAt(0).toUpperCase() || (isAdmin ? 'A' : 'P')}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-900">
                                        {msg.sender?.name || (isAdmin ? 'Admin' : 'Planner')}  
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(msg.sentAt).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className={`rounded-lg p-3 ${
                                    isAdmin 
                                      ? 'bg-blue-600 text-white ml-10'
                                      : 'bg-white border border-gray-200 text-gray-800 ml-10'
                                  }`}>
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={(el) => messageEndRefs.current[event._id] = el} />
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="bg-white border-t border-gray-200 p-4">
                      <div className="flex gap-2">
                        <textarea
                          value={messageInputs[event._id] || ''}
                          onChange={(e) => setMessageInputs(prev => ({ ...prev, [event._id]: e.target.value }))}
                          onKeyPress={(e) => handleKeyPress(e, event._id)}
                          placeholder="Type your message..."
                          rows={2}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        />
                        <button
                          onClick={() => handleSendMessage(event._id)}
                          disabled={!messageInputs[event._id]?.trim() || sendMessageMutation.isPending}
                          className="btn btn-primary px-6 self-end disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendMessageMutation.isPending ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <>
                              <Send className="h-5 w-5 mr-2" />
                              Send
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
