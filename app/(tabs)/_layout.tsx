import { Tabs } from 'expo-router';
import { Home, Sparkles, User, Users, Video, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, useTheme } from '@/theme';

/** Bottom navigation 5 tab (PRD §6.2). Chat Admin dibuka via FAB Beranda atau Profil. */
export default function TabsLayout() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const icon = (Icon: LucideIcon) =>
    function TabIcon({ color, focused }: { color: string; focused: boolean }) {
      return (
        <View style={{ width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? (isDark ? 'rgba(253,186,116,0.14)' : '#FFEDD5') : 'transparent' }}>
          <Icon size={21} color={color} />
        </View>
      );
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#FDBA74' : c.primary,
        tabBarInactiveTintColor: isDark ? '#A8A29E' : '#78716C',
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 64 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8) },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: icon(Home) }} />
      <Tabs.Screen name="chatbot" options={{ title: 'Chatbot', tabBarIcon: icon(Sparkles) }} />
      <Tabs.Screen name="forum" options={{ title: 'Forum', tabBarIcon: icon(Users) }} />
      <Tabs.Screen name="zoom" options={{ title: 'Zoom', tabBarIcon: icon(Video) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon(User) }} />
    </Tabs>
  );
}
