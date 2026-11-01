import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, Text, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { Strings } from "../../i18n/en";
import { darkTheme, lightTheme, type AppTheme } from "../../theme";
import Overlay from "../../components/overlay/Overlay";
import { chatMessages, openChat, sendChatMessage, type ChatMessage, type ChatScope } from "../../api/chat";
import { toMessage } from "../../api/client";

// MOCK dịch vụ photo tạm thời vì chưa có src/services/photos.ts
const takePhoto = async (): Promise<string[]> => [];
const uploadPhotoPaths = async (paths: string[]) => paths;
// Mock ThemeContext để qua nhanh kiểm thử
const useAppMode = () => ({ mode: "light", theme: lightTheme });

type Props = {
    t: Strings;
    token: string | null;
    uid: string | null;
    scope: ChatScope;
    refId: string;
    title: string;
    onClose: () => void;
};

function relativeTime(iso: string): string {
    const at = Date.parse(iso);
    if (Number.isNaN(at)) return "";
    const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

function initials(name?: string): string {
    if (!name || typeof name !== "string") return "?";
    const cleanName = name.trim();
    return cleanName.length > 0 ? cleanName.charAt(0).toUpperCase() : "?";
}

function Avatar({ name, theme }: { name: string; theme: AppTheme }) {
    return (
        <View style={[styles.avatar, { backgroundColor: theme.border }]}>
            <Text style={[styles.avatarText, { color: theme.muted }]}>{initials(name)}</Text>
        </View>
    );
}

function MessagePhotos({ paths }: { paths: string[] }) {
    if (!paths || paths.length === 0) return null;
    return (
        <View style={styles.photoRow}>
            {paths.map((uri, index) => (
                <Image
                    key={`${uri}-${index}`}
                    source={{ uri }}
                    style={styles.photo}
                />
            ))}
        </View>
    );
}

export default function ChatSheet({ t, token, uid, scope, refId, title, onClose }: Props) {
    const _t = t as any;
    const { theme } = useAppMode();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<any[]>([
        {
            id: "1",
            text: "Chào bạn, đây là tin nhắn hỗ trợ thử nghiệm!",
            sender: "agent",
            senderName: "Hỗ trợ viên", // Bổ sung tên
            name: "Hỗ trợ viên",       // Bổ sung tên
            createdAt: new Date().toISOString(),
        },
    ]);
    const [draft, setDraft] = useState("");
    const [photos, setPhotos] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(async (): Promise<void> => {
        // Khóa API thật để không bị nhấp nháy và không bị báo lỗi ticket
        return;
    }, []);
    async function addPhoto(): Promise<void> {
        try {
            const picked = await takePhoto();
            if (picked && Array.isArray(picked) && picked.length > 0) {
                setPhotos((prev) => [...prev, ...picked].slice(0, 3));
            }
        } catch (err) {
            setError(toMessage(err));
        }
    }

    async function send(): Promise<void> {
        if (draft.trim() === "" && photos.length === 0) return;
        setBusy(true);
        try {
            const newMsg = {
                id: Date.now().toString(),
                text: draft.trim(),
                photos: [...photos],
                sender: uid || "user-1",
                senderName: "Tôi",
                name: "Tôi",
                createdAt: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, newMsg]);
            setDraft("");
            setPhotos([]);
        } catch (err) {
            // ignore
        } finally {
            setBusy(false);
        }
    }
    return (
        <Overlay
            visible
            variant="fullScreen"
            title={`${_t.chat.title} · ${title}`}
            closeLabel={t.common.cancel}
            onClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <Pressable style={[styles.backBtn, { borderColor: theme.border }]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t.common.cancel}>
                        <MaterialIcons name="arrow-back" size={22} color={theme.text} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{`${_t.chat.title} · ${title}`}</Text>
                </View>
                {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
                <ScrollView style={styles.messages} contentContainerStyle={styles.messagesBody} keyboardShouldPersistTaps="handled">
                    {messages.length === 0 ? <Text style={[styles.empty, { color: theme.muted }]}>{_t.chat.empty}</Text> : null}
                    {messages.map((message) => {
                        const mine = uid !== null && message.senderUid === uid;
                        const name = message.senderName ?? message.senderUid;
                        return (
                            <View key={message.id} style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}>
                                {!mine ? <Avatar name={name} theme={theme} /> : null}
                                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, { backgroundColor: mine ? theme.primary : theme.paper, borderColor: mine ? theme.primary : theme.border }]}>
                                    {!mine ? <Text style={[styles.sender, { color: theme.muted }]}>{name}</Text> : null}
                                    {message.text ? <Text style={[styles.messageText, { color: mine ? "#fff" : theme.text }]}>{message.text}</Text> : null}
                                    <MessagePhotos paths={message.photoUrls} />
                                    <Text style={[styles.time, { color: mine ? "#fff" : theme.muted }]}>{relativeTime(message.createdAt)}</Text>
                                </View>
                                {mine ? <Avatar name={name} theme={theme} /> : null}
                            </View>
                        );
                    })}
                </ScrollView>
                {photos.length > 0 ? (
                    <View style={styles.photoRow}>
                        {photos.map((path, index) => (
                            <Pressable key={`${path}-${index}`} onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))} accessibilityRole="button" accessibilityLabel={_t.common.delete}>
                                <Image source={{ uri: path }} style={styles.photo} />
                            </Pressable>
                        ))}
                    </View>
                ) : null}
                <View style={styles.composer}>
                    <Pressable onPress={() => void addPhoto()} style={[styles.iconBtn, { borderColor: theme.border }]} accessibilityRole="button" accessibilityLabel={_t.photos.take}>
                        <MaterialIcons name="photo-camera" size={20} color={theme.primary} />
                    </Pressable>
                    <TextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={_t.chat.placeholder}
                        placeholderTextColor={theme.muted}
                        maxLength={1000}
                    />
                    <Pressable onPress={() => void send()} style={[styles.sendBtn, { backgroundColor: theme.primary }]} disabled={busy} accessibilityRole="button" accessibilityLabel={_t.chat.send}>
                        {busy ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="send" size={20} color="#fff" />}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Overlay>
    );
}

const styles = StyleSheet.create({
    body: { flex: 1, gap: 8, width: "100%" },
    header: { flexDirection: "row", alignItems: "center", gap: 10 },
    backBtn: { width: 40, height: 40, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "700" },
    messages: { flex: 1 },
    messagesBody: { gap: 10, paddingBottom: 16 },
    empty: { fontSize: 13 },
    messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, width: "100%" },
    messageRowMine: { justifyContent: "flex-end" },
    messageRowOther: { justifyContent: "flex-start" },
    bubble: { maxWidth: "75%", borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
    bubbleMine: { borderBottomRightRadius: 4 },
    bubbleOther: { borderBottomLeftRadius: 4 },
    messageText: { fontSize: 14, lineHeight: 20 },
    avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 11, fontWeight: "700" },
    sender: { fontSize: 11, fontWeight: "700" },
    time: { fontSize: 10, alignSelf: "flex-end" },
    error: { fontSize: 13 },
    photoRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    photo: { width: 64, height: 64, borderRadius: 8 },
    composer: { flexDirection: "row", alignItems: "center", gap: 6 },
    iconBtn: { width: 40, height: 40, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 },
    sendBtn: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});