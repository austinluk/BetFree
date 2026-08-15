import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, FlatList, TextInput,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  sent_at: string;
}

export default function PartnerChatScreen() {
  const { pairId } = useLocalSearchParams<{ pairId: string }>();
  const profile = useUserStore((s) => s.profile);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);


  useEffect(() => {
    if (!pairId) return;
    loadMessages();

    const channel = supabase
      .channel(`chat-${pairId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'partner_messages',
        filter: `pair_id=eq.${pairId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        // Scroll to end on new incoming message
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pairId]);

  async function loadMessages() {
    const { data } = await supabase
      .from('partner_messages')
      .select('*')
      .eq('pair_id', pairId)
      .order('sent_at', { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data);
      // Scroll to end on initial load only
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }

  async function sendMessage() {
    if (!draft.trim() || !profile || !pairId) return;
    setSending(true);
    await supabase.from('partner_messages').insert({
      pair_id: pairId,
      sender_id: profile.id,
      content: draft.trim(),
    });
    setDraft('');
    setSending(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Your Partner</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const isMe = item.sender_id === profile?.id;
          return (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                {item.content}
              </Text>
              <Text style={styles.bubbleTime}>
                {new Date(item.sent_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Say hello to your accountability partner 👋</Text>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message..."
          placeholderTextColor={Colors.light.textMuted}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!draft.trim() || sending}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.light.backgroundMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { fontSize: 18, color: Colors.light.text },
  title: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  messagesList: { padding: Spacing.lg, gap: Spacing.sm },
  bubble: {
    maxWidth: '80%', borderRadius: Radius.lg,
    padding: Spacing.md, gap: 4,
  },
  bubbleMe: {
    backgroundColor: Colors.light.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.light.backgroundElement,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMe: { color: '#0A0A0F' },
  bubbleTextThem: { color: Colors.light.text },
  bubbleTime: { fontSize: 10, color: Colors.light.textMuted, alignSelf: 'flex-end' },
  emptyText: {
    textAlign: 'center', color: Colors.light.textMuted,
    fontSize: 15, marginTop: 60,
  },
  inputRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  input: {
    flex: 1, backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg, padding: Spacing.md,
    color: Colors.light.text, fontSize: 15,
    borderWidth: 1, borderColor: Colors.light.border,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-end',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 18, fontWeight: '700', color: '#0A0A0F' },
});
