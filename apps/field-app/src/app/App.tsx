import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AssignmentsScreen } from './screens/AssignmentsScreen';
import { IncidentDetailScreen } from './screens/IncidentDetailScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { ReportIncidentScreen } from './screens/ReportIncidentScreen';
import { MyReportsScreen } from './screens/MyReportsScreen';
import type { Incident } from './screens/AssignmentsScreen';
import { db, collection, onSnapshot } from './firebase';

// ── Types ──

type UserMode = 'responder' | 'public';
type ResponderTab = 'assignments' | 'notifications' | 'profile';
type PublicTab = 'report' | 'my-reports';

interface AppUser {
  uid: string;
  display_name: string;
  role: string;
  assigned_unit?: string;
}

interface AppContextState {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
}

const AppContext = createContext<AppContextState>({
  currentUser: null,
  setCurrentUser: () => undefined,
});

export const useAppContext = () => useContext(AppContext);

// ── Role Selection Screen ──

interface RoleSelectionProps {
  onSelectMode: (mode: UserMode) => void;
}

const RoleSelectionScreen: React.FC<RoleSelectionProps> = ({ onSelectMode }) => (
  <View style={roleStyles.container}>
    <Text style={roleStyles.icon}>🚨</Text>
    <Text style={roleStyles.title}>Emergency Response</Text>
    <Text style={roleStyles.subtitle}>How would you like to use this app?</Text>

    <TouchableOpacity
      style={[roleStyles.card, roleStyles.publicCard]}
      onPress={() => onSelectMode('public')}
      activeOpacity={0.7}
    >
      <Text style={roleStyles.cardIcon}>🙋</Text>
      <View style={roleStyles.cardText}>
        <Text style={roleStyles.cardTitle}>Report an Emergency</Text>
        <Text style={roleStyles.cardDesc}>
          I'm a citizen and want to report an incident or track my reports
        </Text>
      </View>
    </TouchableOpacity>

    <TouchableOpacity
      style={[roleStyles.card, roleStyles.responderCard]}
      onPress={() => onSelectMode('responder')}
      activeOpacity={0.7}
    >
      <Text style={roleStyles.cardIcon}>🚒</Text>
      <View style={roleStyles.cardText}>
        <Text style={roleStyles.cardTitle}>Field Responder</Text>
        <Text style={roleStyles.cardDesc}>
          I'm an emergency responder assigned to a unit
        </Text>
      </View>
    </TouchableOpacity>
  </View>
);

// ── Responder Identity Selector ──

interface ResponderSelectProps {
  onSelect: (user: AppUser) => void;
  onBack: () => void;
}

const ResponderSelectScreen: React.FC<ResponderSelectProps> = ({ onSelect, onBack }) => {
  const [responders, setResponders] = useState<AppUser[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser));
        setResponders(all.filter((u) => u.role === 'responder'));
      },
      (error) => console.error('[field-app] Failed to load responders:', error)
    );
    return () => unsub();
  }, []);

  return (
    <ScrollView style={selectStyles.container}>
      <TouchableOpacity style={selectStyles.backButton} onPress={onBack}>
        <Text style={selectStyles.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={selectStyles.title}>Select Your Identity</Text>
      <Text style={selectStyles.hint}>Choose the responder you are operating as</Text>

      {responders.map((user) => (
        <TouchableOpacity
          key={user.uid}
          style={selectStyles.userCard}
          onPress={() => onSelect(user)}
          activeOpacity={0.7}
        >
          <View style={selectStyles.avatar}>
            <Text style={selectStyles.avatarText}>
              {user.display_name.split(' ').map((n) => n[0]).join('')}
            </Text>
          </View>
          <View style={selectStyles.userInfo}>
            <Text style={selectStyles.userName}>{user.display_name}</Text>
            <Text style={selectStyles.userUnit}>
              Unit: {user.assigned_unit ?? 'Unassigned'}
            </Text>
          </View>
          <Text style={selectStyles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// ── Public Name Entry ──

interface PublicNameProps {
  onSubmit: (user: PublicUser) => void;
  onBack: () => void;
}

const PublicNameScreen: React.FC<PublicNameProps> = ({ onSubmit, onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const canSubmit = name.trim().length > 0 && email.trim().includes('@');

  return (
    <View style={nameStyles.container}>
      <TouchableOpacity style={nameStyles.backButton} onPress={onBack}>
        <Text style={nameStyles.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={nameStyles.icon}>🙋</Text>
      <Text style={nameStyles.title}>Your Details</Text>
      <Text style={nameStyles.hint}>
        We'll use your email to save and retrieve your reports
      </Text>

      <Text style={nameStyles.fieldLabel}>Name</Text>
      <TextInput
        style={nameStyles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
        placeholderTextColor="#555"
        autoFocus
      />

      <Text style={nameStyles.fieldLabel}>Email</Text>
      <TextInput
        style={nameStyles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        placeholderTextColor="#555"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[nameStyles.button, !canSubmit && nameStyles.buttonDisabled]}
        onPress={() => canSubmit && onSubmit({ name: name.trim(), email: email.trim().toLowerCase() })}
        disabled={!canSubmit}
        activeOpacity={0.7}
      >
        <Text style={nameStyles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Responder App ──

const responderTabs: { key: ResponderTab; label: string; icon: string }[] = [
  { key: 'assignments', label: 'Assignments', icon: '📋' },
  { key: 'notifications', label: 'Alerts', icon: '🔔' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

interface ResponderAppProps {
  user: AppUser;
  onLogout: () => void;
}

const ResponderApp: React.FC<ResponderAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<ResponderTab>('assignments');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const renderContent = () => {
    if (activeTab === 'profile') {
      return (
        <View style={profileStyles.container}>
          <View style={profileStyles.card}>
            <View style={profileStyles.avatar}>
              <Text style={profileStyles.avatarText}>
                {user.display_name.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
            <Text style={profileStyles.name}>{user.display_name}</Text>
            <Text style={profileStyles.unit}>Unit: {user.assigned_unit ?? 'None'}</Text>
            <Text style={profileStyles.role}>Role: Responder</Text>
          </View>
          <TouchableOpacity style={profileStyles.logoutButton} onPress={onLogout}>
            <Text style={profileStyles.logoutText}>Switch Identity</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (selectedIncident && activeTab === 'assignments') {
      return (
        <IncidentDetailScreen
          incident={selectedIncident}
          onBack={() => setSelectedIncident(null)}
        />
      );
    }

    if (activeTab === 'assignments') {
      return (
        <AssignmentsScreen
          unitId={user.assigned_unit}
          onSelectIncident={setSelectedIncident}
        />
      );
    }

    return (
      <NotificationsScreen userId={user.uid} userRole={user.role} />
    );
  };

  return (
    <>
      <View style={appStyles.header}>
        <Text style={appStyles.headerIcon}>🚒</Text>
        <Text style={appStyles.headerTitle}>Field Response</Text>
        <View style={appStyles.headerBadge}>
          <View style={appStyles.headerDot} />
          <Text style={appStyles.headerBadgeText}>{user.assigned_unit ?? 'NO UNIT'}</Text>
        </View>
      </View>
      <View style={appStyles.content}>{renderContent()}</View>
      <View style={appStyles.tabBar}>
        {responderTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={appStyles.tab}
              onPress={() => { setSelectedIncident(null); setActiveTab(tab.key); }}
              activeOpacity={0.7}
            >
              <Text style={[appStyles.tabIcon, isActive && appStyles.tabIconActive]}>{tab.icon}</Text>
              <Text style={[appStyles.tabLabel, isActive && appStyles.tabLabelActive]}>{tab.label}</Text>
              {isActive && <View style={appStyles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

// ── Public App ──

const publicTabs: { key: PublicTab; label: string; icon: string }[] = [
  { key: 'report', label: 'Report', icon: '🆘' },
  { key: 'my-reports', label: 'My Reports', icon: '📋' },
];

interface PublicAppProps {
  reporterName: string;
  reporterEmail: string;
  onLogout: () => void;
}

const PublicApp: React.FC<PublicAppProps> = ({ reporterName, reporterEmail, onLogout }) => {
  const [activeTab, setActiveTab] = useState<PublicTab>('report');

  const renderContent = () => {
    if (activeTab === 'report') {
      return (
        <ReportIncidentScreen
          reporterName={reporterName}
          reporterEmail={reporterEmail}
          onSubmitted={() => setActiveTab('my-reports')}
        />
      );
    }
    return <MyReportsScreen reporterEmail={reporterEmail} />;
  };

  return (
    <>
      <View style={appStyles.header}>
        <Text style={appStyles.headerIcon}>🚨</Text>
        <Text style={appStyles.headerTitle}>Emergency Report</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={appStyles.logoutLink}>Exit</Text>
        </TouchableOpacity>
      </View>
      <View style={appStyles.content}>{renderContent()}</View>
      <View style={appStyles.tabBar}>
        {publicTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={appStyles.tab}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[appStyles.tabIcon, isActive && appStyles.tabIconActive]}>{tab.icon}</Text>
              <Text style={[appStyles.tabLabel, isActive && appStyles.tabLabelActive]}>{tab.label}</Text>
              {isActive && <View style={appStyles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

// ── Root App ──

interface PublicUser {
  name: string;
  email: string;
}

type AppScreen =
  | { type: 'role-selection' }
  | { type: 'responder-select' }
  | { type: 'public-name' }
  | { type: 'responder'; user: AppUser }
  | { type: 'public'; publicUser: PublicUser };

async function loadSavedPublicUser(): Promise<PublicUser | null> {
  try {
    const saved = await AsyncStorage.getItem('er_public_user');
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

async function savePublicUser(user: PublicUser): Promise<void> {
  await AsyncStorage.setItem('er_public_user', JSON.stringify(user));
}

async function clearPublicUser(): Promise<void> {
  await AsyncStorage.removeItem('er_public_user');
}

export const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>({ type: 'role-selection' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedPublicUser().then((savedUser) => {
      if (savedUser) {
        setScreen({ type: 'public', publicUser: savedUser });
      }
      setLoading(false);
    });
  }, []);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const renderScreen = () => {
    switch (screen.type) {
      case 'role-selection':
        return (
          <RoleSelectionScreen
            onSelectMode={(mode) =>
              setScreen(mode === 'responder' ? { type: 'responder-select' } : { type: 'public-name' })
            }
          />
        );
      case 'responder-select':
        return (
          <ResponderSelectScreen
            onSelect={(user) => { setCurrentUser(user); setScreen({ type: 'responder', user }); }}
            onBack={() => setScreen({ type: 'role-selection' })}
          />
        );
      case 'public-name':
        return (
          <PublicNameScreen
            onSubmit={(publicUser) => {
              savePublicUser(publicUser);
              setScreen({ type: 'public', publicUser });
            }}
            onBack={() => setScreen({ type: 'role-selection' })}
          />
        );
      case 'responder':
        return (
          <ResponderApp
            user={screen.user}
            onLogout={() => { setCurrentUser(null); setScreen({ type: 'role-selection' }); }}
          />
        );
      case 'public':
        return (
          <PublicApp
            reporterName={screen.publicUser.name}
            reporterEmail={screen.publicUser.email}
            onLogout={() => { clearPublicUser(); setScreen({ type: 'role-selection' }); }}
          />
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={appStyles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#121220" />
      </SafeAreaView>
    );
  }

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser }}>
      <StatusBar barStyle="light-content" backgroundColor="#121220" />
      <SafeAreaView style={appStyles.safeArea}>
        {renderScreen()}
      </SafeAreaView>
    </AppContext.Provider>
  );
};

// ── Styles ──

const appStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121220' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#1a1a2e',
    borderBottomWidth: 1, borderBottomColor: '#2a2a3e',
  },
  headerIcon: { fontSize: 20, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#e0e0e0', flex: 1 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b3a1b',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  headerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4caf50', marginRight: 6 },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#4caf50' },
  logoutLink: { fontSize: 14, color: '#6c8cff', fontWeight: '600' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#1a1a2e',
    borderTopWidth: 1, borderTopColor: '#2a2a3e', paddingBottom: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, position: 'relative' },
  tabIcon: { fontSize: 20, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: '#666', marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: '#6c8cff' },
  tabIndicator: {
    position: 'absolute', top: 0, width: 24, height: 2,
    backgroundColor: '#6c8cff', borderRadius: 1,
  },
});

const roleStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220', justifyContent: 'center', padding: 24 },
  icon: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#e0e0e0', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e',
    borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  publicCard: { borderColor: '#d32f2f' },
  responderCard: { borderColor: '#2196f3' },
  cardIcon: { fontSize: 36, marginRight: 16 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#e0e0e0', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#888', lineHeight: 18 },
});

const selectStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220', padding: 16 },
  backButton: { paddingVertical: 8, marginBottom: 8 },
  backText: { fontSize: 16, color: '#6c8cff', fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '700', color: '#e0e0e0', marginBottom: 4 },
  hint: { fontSize: 14, color: '#888', marginBottom: 20 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e',
    borderRadius: 12, padding: 16, marginBottom: 10,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2a2a4e',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#6c8cff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#e0e0e0' },
  userUnit: { fontSize: 13, color: '#888', marginTop: 2 },
  arrow: { fontSize: 24, color: '#444' },
});

const nameStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220', padding: 24 },
  backButton: { paddingVertical: 8, marginBottom: 24 },
  backText: { fontSize: 16, color: '#6c8cff', fontWeight: '500' },
  icon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#e0e0e0', textAlign: 'center', marginBottom: 8 },
  hint: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#aaa', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16,
    color: '#e0e0e0', fontSize: 16, borderWidth: 1, borderColor: '#2a2a3e',
    marginBottom: 24,
  },
  button: { backgroundColor: '#d32f2f', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220', padding: 16, alignItems: 'center', paddingTop: 32 },
  card: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 24, alignItems: 'center', width: '100%', marginBottom: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#2a2a4e',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#6c8cff',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#6c8cff' },
  name: { fontSize: 20, fontWeight: '700', color: '#e0e0e0', marginBottom: 4 },
  unit: { fontSize: 14, color: '#888' },
  role: { fontSize: 14, color: '#666', marginTop: 2 },
  logoutButton: {
    backgroundColor: '#2a2a3e', borderRadius: 10, paddingVertical: 12,
    paddingHorizontal: 32, borderWidth: 1, borderColor: '#3a3a5e',
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#6c8cff' },
});

export default App;
