import React, {useEffect, useState} from "react";
import {AppState, ScrollView, StyleSheet, TouchableOpacity, View} from "react-native";
import * as Linking from "expo-linking";
import {AppText as Text} from "../components/AppText";
import {toMessage} from "../api/client";
import {purchaseSubscription, type SubscriptionPlanId} from "../api/subscriptions";
import {useAuth} from "../context/AuthContext";
import {useProfile} from "../context/ProfileContext";
import {useStrings} from "../context/LanguageContext";

type PlanCard = {
    id: SubscriptionPlanId;
    name: string;
    price: string;
    period: string;
    desc: string;
    popular?: boolean;
};

type PendingPayment = {
    paymentId: string;
    checkoutUrl: string;
};

const FALLBACK_AMOUNTS: Record<SubscriptionPlanId, number> = {
    WEEKLY: 40000,
    MONTHLY: 200000,
    YEARLY: 1500000,
};

export default function SubscriptionScreen() {
    const { lang } = useStrings();
    const { token } = useAuth();
    const { subscription, subscriptionPlans, isVip, refresh } = useProfile();
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('MONTHLY');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, setPending] = useState<PendingPayment | null>(null);
    const [waitingExpired, setWaitingExpired] = useState(false);

    const copy = lang === 'vi' ? {
        active: 'VIP đang hoạt động',
        until: 'đến',
        expired: 'Gói VIP đã hết hạn',
        expiredOn: 'Hết hạn ngày',
        renew: 'Gia hạn',
        subscribe: 'Đăng Ký Ngay',
        opening: 'Đang mở trang thanh toán SePay…',
        opened: 'Hoàn tất thanh toán trong trình duyệt. Trạng thái sẽ tự cập nhật.',
        waiting: 'Đang chờ thanh toán',
        waitingHint: 'Sau khi thanh toán, quay lại ứng dụng hoặc kiểm tra trạng thái.',
        waitingExpired: 'Chưa nhận được thanh toán',
        waitingExpiredHint: 'Bạn có thể mở lại trang thanh toán hoặc kiểm tra lại sau.',
        checkStatus: 'Kiểm tra trạng thái',
        openCheckout: 'Mở lại thanh toán',
        success: 'Thanh toán thành công. VIP đã được kích hoạt.',
        notYet: 'Chưa nhận được thanh toán. Vui lòng hoàn tất giao dịch.',
        noCheckout: 'Không nhận được liên kết thanh toán.',
        popular: 'Phổ biến nhất',
        current: 'Đang dùng',
        noToken: 'Vui lòng đăng nhập lại để tiếp tục.',
        title: 'Chọn gói dịch vụ VIP',
        subtitle: 'Tận hưởng trọn vẹn các tính năng hỗ trợ và cứu hộ đường bộ 24/7',
        weekly: 'Gói Tuần',
        monthly: 'Gói Tháng',
        yearly: 'Gói Năm',
        perWeek: '/ tuần',
        perMonth: '/ tháng',
        perYear: '/ năm',
        weeklyDesc: 'Cứu hộ cơ bản trong 7 ngày',
        monthlyDesc: 'Tiết kiệm 30%, hỗ trợ ưu tiên 24/7',
        yearlyDesc: 'Tiết kiệm nhất, ưu đãi dịch vụ đặc quyền',
        money: (amount: number) => `${amount.toLocaleString('vi-VN')} VNĐ`,
    } : {
        active: 'VIP active',
        until: 'until',
        expired: 'Your VIP plan has expired',
        expiredOn: 'Expired on',
        renew: 'Renew',
        subscribe: 'Subscribe Now',
        opening: 'Opening the SePay checkout…',
        opened: 'Complete the payment in your browser. The status will update automatically.',
        waiting: 'Waiting for payment',
        waitingHint: 'After paying, return to the app or check the status.',
        waitingExpired: 'Payment not received yet',
        waitingExpiredHint: 'You can reopen the checkout or check again shortly.',
        checkStatus: 'Check status',
        openCheckout: 'Open checkout again',
        success: 'Payment successful. VIP is active.',
        notYet: 'Payment not received yet. Please complete the checkout.',
        noCheckout: 'No checkout link was returned.',
        popular: 'Most Popular',
        current: 'Current plan',
        noToken: 'Please sign in again to continue.',
        title: 'Choose VIP Subscription Plan',
        subtitle: 'Enjoy full access to 24/7 roadside assistance features',
        weekly: 'Weekly Plan',
        monthly: 'Monthly Plan',
        yearly: 'Yearly Plan',
        perWeek: '/ week',
        perMonth: '/ month',
        perYear: '/ year',
        weeklyDesc: 'Basic roadside assistance for 7 days',
        monthlyDesc: 'Save 30%, 24/7 priority support',
        yearlyDesc: 'Best value, exclusive perks',
        money: (amount: number) => `${amount.toLocaleString('en-US')} VND`,
    };

    useEffect(() => {
        const current = subscription?.planId;
        if (current === 'WEEKLY' || current === 'MONTHLY' || current === 'YEARLY') {
            setSelectedPlan(current);
        }
    }, [subscription?.planId]);

    useEffect(() => {
        if (!pending) return;
        let cancelled = false;
        const check = async () => {
            const next = await refresh();
            if (cancelled) return;
            const nextSub = next?.subscription ?? null;
            const expiresAt = nextSub ? Date.parse(nextSub.expiresAt) : NaN;
            if (nextSub?.status === 'ACTIVE' && Number.isFinite(expiresAt) && expiresAt > Date.now()) {
                setPending(null);
                setWaitingExpired(false);
                setNotice(lang === 'vi'
                    ? 'Thanh toán thành công. VIP đã được kích hoạt.'
                    : 'Payment successful. VIP is active.');
            }
        };
        const interval = setInterval(() => { void check(); }, 4000);
        const appState = AppState.addEventListener('change', (state) => {
            if (state === 'active') void check();
        });
        const timeout = setTimeout(() => {
            if (!cancelled) setWaitingExpired(true);
        }, 120000);
        return () => {
            cancelled = true;
            clearInterval(interval);
            clearTimeout(timeout);
            appState.remove();
        };
    }, [pending?.paymentId, refresh, lang]);

    const amountFor = (id: SubscriptionPlanId): number =>
        subscriptionPlans.find((plan) => plan.id === id)?.amount ?? FALLBACK_AMOUNTS[id];

    const plans: PlanCard[] = [
        {
            id: 'WEEKLY',
            name: copy.weekly,
            price: copy.money(amountFor('WEEKLY')),
            period: copy.perWeek,
            desc: copy.weeklyDesc,
        },
        {
            id: 'MONTHLY',
            name: copy.monthly,
            price: copy.money(amountFor('MONTHLY')),
            period: copy.perMonth,
            popular: true,
            desc: copy.monthlyDesc,
        },
        {
            id: 'YEARLY',
            name: copy.yearly,
            price: copy.money(amountFor('YEARLY')),
            period: copy.perYear,
            desc: copy.yearlyDesc,
        },
    ];

    const planName = (id: string): string =>
        plans.find((plan) => plan.id === id)?.name ?? id;

    const formatDate = (iso: string): string => {
        const date = new Date(iso);
        return Number.isNaN(date.getTime())
            ? iso
            : date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB');
    };

    const checkNow = async () => {
        const next = await refresh();
        const nextSub = next?.subscription ?? null;
        const expiresAt = nextSub ? Date.parse(nextSub.expiresAt) : NaN;
        if (nextSub?.status === 'ACTIVE' && Number.isFinite(expiresAt) && expiresAt > Date.now()) {
            setPending(null);
            setWaitingExpired(false);
            setNotice(copy.success);
        } else {
            setNotice(copy.notYet);
        }
    };

    const openCheckout = async (url: string | null) => {
        if (!url) return;
        try {
            await Linking.openURL(url);
        } catch (err) {
            setError(toMessage(err));
        }
    };

    const handleSubscribe = async () => {
        if (!token) {
            setError(copy.noToken);
            return;
        }
        if (busy) return;
        setBusy(true);
        setError(null);
        setNotice(null);
        setWaitingExpired(false);
        try {
            const result = await purchaseSubscription(selectedPlan, token);
            if (result.checkoutUrl) {
                setPending({
                    paymentId: result.paymentId,
                    checkoutUrl: result.checkoutUrl,
                });
                setNotice(copy.opening);
                await openCheckout(result.checkoutUrl);
                setNotice(copy.opened);
            } else if (result.status !== 'PENDING') {
                await checkNow();
            } else {
                setError(copy.noCheckout);
            }
        } catch (err) {
            setError(toMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.headerTitle}>{copy.title}</Text>
            <Text style={styles.headerSubtitle}>{copy.subtitle}</Text>

            {isVip && subscription && (
                <View style={styles.activeCard}>
                    <Text style={styles.activeTitle}>{copy.active}</Text>
                    <Text style={styles.activeText}>
                        {planName(subscription.planId)} · {copy.until} {formatDate(subscription.expiresAt)}
                    </Text>
                </View>
            )}
            {!isVip && subscription?.status === 'EXPIRED' && (
                <View style={styles.expiredCard}>
                    <Text style={styles.expiredTitle}>{copy.expired}</Text>
                    <Text style={styles.expiredText}>
                        {copy.expiredOn} {formatDate(subscription.expiresAt)}
                    </Text>
                </View>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
            {notice && <Text style={styles.noticeText}>{notice}</Text>}

            {pending && (
                <View style={styles.waitingCard}>
                    <Text style={styles.waitingTitle}>
                        {waitingExpired ? copy.waitingExpired : copy.waiting}
                    </Text>
                    <Text style={styles.waitingText}>
                        {waitingExpired ? copy.waitingExpiredHint : copy.waitingHint}
                    </Text>
                    <View style={styles.waitingActions}>
                        <TouchableOpacity style={styles.smallBtn} onPress={() => { void checkNow(); }}>
                            <Text style={styles.smallBtnText}>{copy.checkStatus}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.smallBtnAlt} onPress={() => { void openCheckout(pending.checkoutUrl); }}>
                            <Text style={styles.smallBtnAltText}>{copy.openCheckout}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {plans.map((item) => {
                const isSelected = selectedPlan === item.id;
                const isCurrent = isVip && subscription?.planId === item.id;
                return (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.planCard, isSelected && styles.selectedCard]}
                        onPress={() => setSelectedPlan(item.id)}
                        activeOpacity={0.8}
                    >
                        {item.popular && (
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularText}>{copy.popular}</Text>
                            </View>
                        )}
                        {isCurrent && (
                            <View style={styles.currentBadge}>
                                <Text style={styles.popularText}>{copy.current}</Text>
                            </View>
                        )}
                        <View style={styles.planHeader}>
                            <Text style={styles.planName}>{item.name}</Text>
                            <Text style={styles.planPrice}>
                                {item.price}<Text style={styles.periodText}>{item.period}</Text>
                            </Text>
                        </View>
                        <Text style={styles.planDesc}>{item.desc}</Text>
                    </TouchableOpacity>
                );
            })}

            <TouchableOpacity
                style={[styles.subscribeBtn, (busy || !token) && styles.subscribeBtnDisabled]}
                onPress={() => { void handleSubscribe(); }}
                disabled={busy || !token}
            >
                <Text style={styles.subscribeBtnText}>
                    {busy ? copy.opening : isVip ? copy.renew : copy.subscribe}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginTop: 10 },
    headerSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 6, marginBottom: 20 },
    activeCard: {
        backgroundColor: '#ecfdf5',
        borderColor: '#16a34a',
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    activeTitle: { fontSize: 16, fontWeight: 'bold', color: '#15803d' },
    activeText: { fontSize: 13, color: '#166534', marginTop: 4 },
    expiredCard: {
        backgroundColor: '#fef2f2',
        borderColor: '#f87171',
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    expiredTitle: { fontSize: 16, fontWeight: 'bold', color: '#b91c1c' },
    expiredText: { fontSize: 13, color: '#991b1b', marginTop: 4 },
    errorText: { fontSize: 13, color: '#b91c1c', marginBottom: 12, textAlign: 'center' },
    noticeText: { fontSize: 13, color: '#15803d', marginBottom: 12, textAlign: 'center' },
    waitingCard: {
        backgroundColor: '#eff6ff',
        borderColor: '#93c5fd',
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    waitingTitle: { fontSize: 16, fontWeight: 'bold', color: '#1d4ed8' },
    waitingText: { fontSize: 13, color: '#1e40af', marginTop: 4 },
    waitingActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
    smallBtn: { backgroundColor: '#1d4ed8', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
    smallBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
    smallBtnAlt: { borderColor: '#1d4ed8', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
    smallBtnAltText: { color: '#1d4ed8', fontSize: 12, fontWeight: 'bold' },
    planCard: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        marginBottom: 16,
        position: 'relative',
    },
    selectedCard: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
    popularBadge: {
        position: 'absolute',
        top: -12,
        right: 16,
        backgroundColor: '#f59e0b',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    currentBadge: {
        position: 'absolute',
        top: -12,
        left: 16,
        backgroundColor: '#16a34a',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    popularText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    planName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    planPrice: { fontSize: 18, fontWeight: 'bold', color: '#d97706' },
    periodText: { fontSize: 12, color: '#64748b', fontWeight: 'normal' },
    planDesc: { fontSize: 13, color: '#475569' },
    subscribeBtn: {
        backgroundColor: '#f59e0b',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 40,
    },
    subscribeBtnDisabled: { opacity: 0.6 },
    subscribeBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
