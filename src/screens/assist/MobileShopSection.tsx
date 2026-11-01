import { View, StyleSheet, Text, Pressable } from "react-native";
import type { Strings } from "../../i18n/en";
import type { AppTheme } from "../../theme";
import type { DispatchTicket } from "../../api/dispatch";

export type FeedTicket = DispatchTicket & {
    direction?: string;
    otherParty?: { id: string; name: string; kind: string };
};

type Props = {
    t: Strings;
    theme: AppTheme;
    tickets: DispatchTicket[];
    loading: boolean;
    locationMissing: boolean;
    onOpen: (ticket: any) => void;
};

function toFeed(ticket: any, t: any): FeedTicket {
    const riderName =
        typeof ticket.riderName === "string" && ticket.riderName !== ""
            ? ticket.riderName
            : t.assist?.unassigned ?? "Chưa phân công";
    return {
        ...ticket,
        direction: "in",
        otherParty: { id: ticket.userId, name: riderName, kind: "RIDER" },
    } as FeedTicket;
}

export default function MobileShopSection({
    t,
    theme,
    tickets,
    loading,
    locationMissing,
    onOpen,
}: Props) {
    const _t = t as any;

    return (
        <View style={styles.wrap}>
            <Text style={[styles.section, { color: theme.text }]}>
                {_t.assist?.mobileShopRequests ?? "Yêu cầu sửa chữa lưu động"}
            </Text>
            {locationMissing ? (
                <Text style={[styles.hint, { color: theme.muted }]}>
                    {_t.assist?.towLocationNeeded ?? "Cần chia sẻ vị trí để tìm dịch vụ gần bạn"}
                </Text>
            ) : loading && tickets.length === 0 ? (
                <Text style={[styles.hint, { color: theme.muted }]}>
                    {_t.common?.loading ?? "Đang tải..."}
                </Text>
            ) : tickets.length === 0 ? (
                <Text style={[styles.hint, { color: theme.muted }]}>
                    {_t.assist?.noNearby ?? "Không có yêu cầu nào gần đây"}
                </Text>
            ) : (
                tickets.map((ticket) => {
                    const row = toFeed(ticket, _t);
                    return (
                        <Pressable
                            key={ticket.id}
                            style={[styles.row, { borderColor: theme.border }]}
                            onPress={() => onOpen(row)}
                        >
                            <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
                                {row.otherParty?.name ?? ticket.id}
                            </Text>
                        </Pressable>
                    );
                })
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        padding: 16,
    },
    section: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
    },
    hint: {
        fontSize: 14,
        marginVertical: 4,
    },
    row: {
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
});