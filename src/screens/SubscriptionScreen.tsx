import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useStrings } from '../context/LanguageContext'; // Hoặc đường dẫn tới LanguageContext trong project

export default function SubscriptionScreen() {
    const { lang } = useStrings(); // Lấy ngôn ngữ hiện tại ('vi' hoặc 'en')
    const [selectedPlan, setSelectedPlan] = useState<string>('monthly');

    const plans = [
        {
            id: 'weekly',
            name: lang === 'vi' ? 'Gói Tuần' : 'Weekly Plan',
            price: '40.000 VNĐ',
            period: lang === 'vi' ? '/ tuần' : '/ week',
            desc: lang === 'vi' ? 'Cứu hộ cơ bản trong 7 ngày' : 'Basic roadside assistance for 7 days',
        },
        {
            id: 'monthly',
            name: lang === 'vi' ? 'Gói Tháng' : 'Monthly Plan',
            price: '200.000 VNĐ',
            period: lang === 'vi' ? '/ tháng' : '/ month',
            popular: true,
            desc: lang === 'vi' ? 'Tiết kiệm 30%, hỗ trợ ưu tiên 24/7' : 'Save 30%, 24/7 priority support',
        },
        {
            id: 'yearly',
            name: lang === 'vi' ? 'Gói Năm' : 'Yearly Plan',
            price: '1.500.000 VNĐ',
            period: lang === 'vi' ? '/ năm' : '/ year',
            desc: lang === 'vi' ? 'Tiết kiệm nhất, ưu đãi dịch vụ đặc quyền' : 'Best value, exclusive perks',
        },
    ];

    const handleSubscribe = () => {
        const plan = plans.find(p => p.id === selectedPlan);
        Alert.alert(
            lang === 'vi' ? 'Xác nhận đăng ký' : 'Subscription Confirmation',
            lang === 'vi'
                ? `Bạn đã chọn ${plan?.name} với giá ${plan?.price}.`
                : `You selected ${plan?.name} for ${plan?.price}.`,
            [{ text: 'OK' }]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.headerTitle}>
                {lang === 'vi' ? 'Chọn gói dịch vụ VIP' : 'Choose VIP Subscription Plan'}
            </Text>
            <Text style={styles.headerSubtitle}>
                {lang === 'vi'
                    ? 'Tận hưởng trọn vẹn các tính năng hỗ trợ và cứu hộ đường bộ 24/7'
                    : 'Enjoy full access to 24/7 roadside assistance features'}
            </Text>

            {plans.map((item) => {
                const isSelected = selectedPlan === item.id;
                return (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.planCard, isSelected && styles.selectedCard]}
                        onPress={() => setSelectedPlan(item.id)}
                        activeOpacity={0.8}
                    >
                        {item.popular && (
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularText}>
                                    {lang === 'vi' ? 'Phổ biến nhất' : 'Most Popular'}
                                </Text>
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

            <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe}>
                <Text style={styles.subscribeBtnText}>
                    {lang === 'vi' ? 'Đăng Ký Ngay' : 'Subscribe Now'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginTop: 10 },
    headerSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 6, marginBottom: 20 },
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
    subscribeBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});