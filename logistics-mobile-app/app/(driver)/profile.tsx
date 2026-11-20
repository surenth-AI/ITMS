import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { LANGUAGES, SupportedLanguage } from '../../i18n';
import { useTranslation } from 'react-i18next';

const SUB_SCORE_KEYS = [
  { key: 'on_time_delivery',  value: 95, icon: 'time-outline' as const },
  { key: 'fuel_efficiency',   value: 78, icon: 'speedometer-outline' as const },
  { key: 'idle_time',         value: 65, icon: 'pause-circle-outline' as const },
  { key: 'harsh_braking',     value: 92, icon: 'warning-outline' as const },
  { key: 'route_adherence',   value: 88, icon: 'map-outline' as const },
];

function scoreColor(v: number, c: any): string {
  if (v >= 80) return c.success;
  if (v >= 60) return c.warning;
  return c.danger;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileScreen() {
  const { theme, toggleTheme } = useThemeStore();
  const c = colors[theme];
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();

  const [langModalVisible, setLangModalVisible] = useState(false);

  const overallScore = 82;
  const overallColor = scoreColor(overallScore, c);
  const driverName = user?.full_name || 'Driver';

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const currentLang = LANGUAGES.find(l => l.code === language);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + name ── */}
        <View style={[s.avatarSection, { borderBottomColor: c.border }]}>
          <View style={[s.avatar, { backgroundColor: c.primary + '22', borderColor: c.primary + '55' }]}>
            <Text style={[s.avatarTxt, { color: c.primary }]}>{initials(driverName)}</Text>
          </View>
          <Text style={[s.name, { color: c.text }]}>{driverName}</Text>
          <Text style={[s.role, { color: c.textMuted }]}>{t('profile.role')}</Text>
        </View>

        {/* ── Today at a glance ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.cardTitle, { color: c.text }]}>{t('profile.today_stats')}</Text>
          <View style={s.todayRow}>
            {[
              { label: t('profile.trips'),    value: '3' },
              { label: t('profile.distance'), value: '142 mi' },
              { label: t('profile.on_time'),  value: '100%' },
            ].map((stat) => (
              <View key={stat.label} style={s.todayStat}>
                <Text style={[s.todayVal, { color: c.text }]}>{stat.value}</Text>
                <Text style={[s.todayLbl, { color: c.textMuted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Overall score ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.cardTitle, { color: c.text }]}>{t('profile.overall_score')}</Text>
          <View style={s.scoreRow}>
            <View style={[s.scoreBadge, { backgroundColor: overallColor + '18', borderColor: overallColor + '55' }]}>
              <Text style={[s.scoreNum, { color: overallColor }]}>{overallScore}</Text>
              <Text style={[s.scoreMax, { color: overallColor }]}>/100</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={[s.scoreSummary, { color: c.text }]}>
                {overallScore >= 80
                  ? t('profile.excellent')
                  : overallScore >= 60
                  ? t('profile.good')
                  : t('profile.needs_improvement')}
              </Text>
              <Text style={[s.scorePeriod, { color: c.textMuted }]}>{t('profile.based_on')}</Text>
            </View>
          </View>
        </View>

        {/* ── Sub scores ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.cardTitle, { color: c.text }]}>{t('profile.score_breakdown')}</Text>
          {SUB_SCORE_KEYS.map((item, i) => {
            const barColor = scoreColor(item.value, c);
            return (
              <View key={i} style={[s.subRow, i < SUB_SCORE_KEYS.length - 1 && { marginBottom: 14 }]}>
                <View style={[s.subIcon, { backgroundColor: barColor + '15' }]}>
                  <Ionicons name={item.icon} size={15} color={barColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.subHeader}>
                    <Text style={[s.subLabel, { color: c.text }]}>{t(`scores.${item.key}`)}</Text>
                    <Text style={[s.subValue, { color: barColor }]}>{item.value}</Text>
                  </View>
                  <View style={[s.bar, { backgroundColor: c.border }]}>
                    <View style={[s.barFill, { width: `${item.value}%` as any, backgroundColor: barColor }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Quick links ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {[
            {
              label: t('profile.attendance'),
              icon: 'calendar-outline' as const,
              onPress: () => router.push('/(driver)/attendance'),
            },
            {
              label: t('profile.performance_history'),
              icon: 'bar-chart-outline' as const,
              onPress: () => router.push('/(driver)/performance'),
            },
            {
              label: theme === 'dark' ? t('profile.switch_light') : t('profile.switch_dark'),
              icon: (theme === 'dark' ? 'sunny-outline' : 'moon-outline') as any,
              onPress: toggleTheme,
            },
            {
              label: `${t('profile.language')}  ${currentLang?.flag ?? '🌐'}  ${currentLang?.nativeName ?? 'English'}`,
              icon: 'globe-outline' as const,
              onPress: () => setLangModalVisible(true),
            },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={i}
              style={[s.linkRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <View style={[s.linkIcon, { backgroundColor: c.background }]}>
                <Ionicons name={item.icon} size={18} color={c.primary} />
              </View>
              <Text style={[s.linkLabel, { color: c.text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* ── Logout ── */}
      <View style={[s.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
        <TouchableOpacity style={[s.logoutBtn, { borderColor: c.danger }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={c.danger} style={{ marginRight: 8 }} />
          <Text style={[s.logoutTxt, { color: c.danger }]}>{t('profile.sign_out')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Language Picker Modal ── */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[s.modalSheet, { backgroundColor: c.card, borderColor: c.border }]}
          >
            {/* Handle */}
            <View style={[s.handle, { backgroundColor: c.border }]} />

            <Text style={[s.modalTitle, { color: c.text }]}>{t('settings.language_title')}</Text>
            <Text style={[s.modalSubtitle, { color: c.textMuted }]}>{t('settings.language_subtitle')}</Text>

            <View style={s.langList}>
              {LANGUAGES.map((lang) => {
                const isSelected = lang.code === language;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      s.langRow,
                      { borderColor: isSelected ? c.primary : c.border },
                      isSelected && { backgroundColor: c.primary + '12' },
                    ]}
                    onPress={async () => {
                      await setLanguage(lang.code as SupportedLanguage);
                      setLangModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.langFlag}>{lang.flag}</Text>
                    <View style={s.langInfo}>
                      <Text style={[s.langNative, { color: c.text }]}>{lang.nativeName}</Text>
                      <Text style={[s.langRegion, { color: c.textMuted }]}>{lang.region}</Text>
                    </View>
                    {isSelected && (
                      <View style={[s.checkBadge, { backgroundColor: c.primary }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 24 },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarTxt: { fontSize: 26, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  role: { fontSize: 13 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },

  todayRow: { flexDirection: 'row' },
  todayStat: { flex: 1, alignItems: 'center' },
  todayVal: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  todayLbl: { fontSize: 12 },

  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  scoreNum: { fontSize: 28, fontWeight: '800' },
  scoreMax: { fontSize: 13, fontWeight: '600', alignSelf: 'flex-end', marginBottom: 4 },
  scoreSummary: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  scorePeriod: { fontSize: 13 },

  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  subLabel: { fontSize: 14 },
  subValue: { fontSize: 14, fontWeight: '700' },
  bar: { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  linkIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  footer: { padding: 16, borderTopWidth: 1 },
  logoutBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutTxt: { fontSize: 15, fontWeight: '700' },

  // ── Language Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  langList: { gap: 10 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 14,
  },
  langFlag: { fontSize: 28 },
  langInfo: { flex: 1 },
  langNative: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  langRegion: { fontSize: 13 },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
