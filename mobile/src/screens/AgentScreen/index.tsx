import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { MainTemplate } from '@/templates/MainTemplate';
import { useAppSelector } from '@/hooks/useAppStore';
import { ENV } from '@/constants/env';
import { styles } from './AgentScreen.styles';
import { useThemeColors } from '@/hooks/useThemeColors';

interface IMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reasoning?: string;
  tools?: Array<{ name: string; status: 'running' | 'completed' }>;
  traceId?: string;
}

export const AgentScreen = () => {
  const c = useThemeColors();
  const token = useAppSelector((state) => state.auth.token);
  const [messages, setMessages] = useState<IMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Qué onda, compa! Soy tu asistente de gestión de tareas. ¿En qué te puedo echar una mano hoy? Puedes pedirme cosas como "muestra mis tareas", "crea un pendiente" o "elimina una tarea".',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendChatMessage = async (userMessage: string, confirmToken?: string) => {
    if (!userMessage.trim() || loading) return;

    const userMessageId = Math.random().toString(36).substring(7);
    const assistantMessageId = Math.random().toString(36).substring(7);

    // 1. Add User Message
    const newUserMsg: IMessage = {
      id: userMessageId,
      role: 'user',
      text: userMessage.trim(),
    };

    // 2. Add empty Assistant Message placeholder
    const newAssistantMsg: IMessage = {
      id: assistantMessageId,
      role: 'assistant',
      text: '',
      reasoning: '',
      tools: [],
    };

    setMessages((prev) => [...prev, newUserMsg, newAssistantMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${ENV.API_URL}/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.trim(),
          ...(confirmToken && { confirmationToken: confirmToken }),
        }),
      });

      if (!response.ok) {
        throw new Error('Error de conexión con el agente.');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming no soportado en este dispositivo.');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode value with TextDecoder or fallback
        let chunkText = '';
        try {
          chunkText = decoder.decode(value, { stream: true });
        } catch {
          chunkText = Array.from(value)
            .map((b) => String.fromCharCode(b))
            .join('');
        }

        buffer += chunkText;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;
          const jsonStr = cleanLine.substring(6);

          try {
            const event = JSON.parse(jsonStr);

            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === assistantMessageId) {
                  const updated = { ...msg };

                  if (event.traceId) {
                    updated.traceId = event.traceId;
                  }

                  if (event.type === 'reasoning' && event.content) {
                    updated.reasoning = (updated.reasoning || '') + event.content;
                  } else if (event.type === 'delta' && event.content) {
                    updated.text = (updated.text || '') + event.content;
                  } else if (event.type === 'tool_call' && event.toolName) {
                    const exists = updated.tools?.some((t) => t.name === event.toolName && t.status === 'running');
                    if (!exists) {
                      updated.tools = [
                        ...(updated.tools || []),
                        { name: event.toolName, status: 'running' },
                      ];
                    }
                  } else if (event.type === 'tool_result' && event.toolName) {
                    updated.tools = (updated.tools || []).map((t) =>
                      t.name === event.toolName ? { ...t, status: 'completed' } : t
                    );
                  }

                  return updated;
                }
                return msg;
              })
            );

            // Handle pending confirmation alert
            if (event.type === 'done' && event.pendingConfirmation) {
              const { taskId, confirmToken: nextConfirmToken } = event.pendingConfirmation;
              
              setLoading(false); // Stop loading temporarily during dialog interaction

              Alert.alert(
                'Confirmación Requerida',
                '¿Estás seguro de que quieres eliminar esta tarea, compa? Es destructivo.',
                [
                  {
                    text: 'Cancelar',
                    style: 'cancel',
                  },
                  {
                    text: 'Confirmar',
                    style: 'destructive',
                    onPress: () => {
                      void sendChatMessage('Sí, eliminar tarea', nextConfirmToken);
                    },
                  },
                ],
                { cancelable: false }
              );
            }
          } catch (e) {
            // Bad chunk or formatting issue, skip
          }
        }
      }
    } catch (error: any) {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === assistantMessageId) {
            return {
              ...msg,
              text: `⚠️ Error: ${error.message || 'Error al comunicarse con el agente.'}`,
            };
          }
          return msg;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainTemplate showHeader={true}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            return (
              <View
                style={[
                  styles.bubbleContainer,
                  isUser ? styles.userContainer : styles.assistantContainer,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  {/* Reasoning block */}
                  {!isUser && item.reasoning ? (
                    <View style={styles.reasoningBlock}>
                      <Text style={styles.reasoningTitle}>Pensamiento del Agente</Text>
                      <Text style={styles.reasoningText}>{item.reasoning}</Text>
                    </View>
                  ) : null}

                  {/* Tools block */}
                  {!isUser && item.tools && item.tools.length > 0 ? (
                    <View style={styles.toolsBlock}>
                      {item.tools.map((t: { name: string; status: 'running' | 'completed' }, idx: number) => {
                        const isRunning = t.status === 'running';
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.toolBadge,
                              isRunning ? styles.toolBadgeRunning : styles.toolBadgeCompleted,
                            ]}
                          >
                            <Ionicons
                              name={isRunning ? 'cog' : 'checkmark-circle'}
                              size={12}
                              color={isRunning ? '#c75c2a' : '#124c5a'}
                            />
                            <Text
                              style={[
                                styles.toolText,
                                isRunning ? styles.toolTextRunning : styles.toolTextCompleted,
                              ]}
                            >
                              {isRunning ? `Ejecutando: ${t.name}` : `Ejecutado: ${t.name}`}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  {/* Message body */}
                  <Text style={isUser ? styles.userText : styles.assistantText}>
                    {item.text || (loading && !item.reasoning && !item.tools?.length ? 'Pensando...' : '')}
                  </Text>

                  {/* TraceId */}
                  {!isUser && item.traceId ? (
                    <Text style={styles.traceText}>TraceId: {item.traceId}</Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />

        {/* Input composer */}
        <View style={styles.composer}>
          <TextInput
            style={[styles.input, isFocused && styles.inputFocused]}
            placeholder="Dile algo a tu compa..."
            value={input}
            onChangeText={setInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            accessibilityLabel="Mensaje para el agente"
          />
          <Pressable
            style={[
              styles.sendButton,
              (!input.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={() => sendChatMessage(input)}
            disabled={!input.trim() || loading}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={18} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </MainTemplate>
  );
};
