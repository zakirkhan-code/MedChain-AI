import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../utils/theme";

import WalletConnectScreen from "../screens/auth/WalletConnectScreen";
import ConnectWalletScreen from "../screens/shared/ConnectWalletScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import PatientHomeScreen from "../screens/patient/PatientHomeScreen";
import RecordsScreen from "../screens/patient/RecordsScreen";
import AddRecordScreen from "../screens/patient/AddRecordScreen";
import RecordDetailScreen from "../screens/patient/RecordDetailScreen";
import DoctorListScreen from "../screens/patient/DoctorListScreen";
import DoctorDetailScreen from "../screens/patient/DoctorDetailScreen";
import AccessScreen from "../screens/patient/AccessScreen";
import DoctorHomeScreen from "../screens/doctor/DoctorHomeScreen";
import DoctorProfileScreen from "../screens/doctor/DoctorProfileScreen";
import AIChatScreen from "../screens/shared/AIChatScreen";
import ProfileScreen from "../screens/shared/ProfileScreen";
import EditProfileScreen from "../screens/shared/EditProfileScreen";
import ChangePasswordScreen from "../screens/shared/ChangePasswordScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.white },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: "600", fontSize: 17 },
  headerShadowVisible: false,
};

function PatientTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color }) => {
        const icons = { Home: "home", Records: "document-text", AIChat: "chatbubbles", Profile: "person" };
        return <Ionicons name={focused ? icons[route.name] : `${icons[route.name]}-outline`} size={22} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textLight,
      tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6, borderTopWidth: 0, elevation: 10 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      headerShown: false,
    })}>
      <Tab.Screen name="Home" component={PatientHomeScreen} />
      <Tab.Screen name="Records" component={RecordsScreen} />
      <Tab.Screen name="AIChat" component={AIChatScreen} options={{ tabBarLabel: "AI Chat" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function DoctorTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color }) => {
        const icons = { Home: "home", AIChat: "chatbubbles", Profile: "person" };
        return <Ionicons name={focused ? icons[route.name] : `${icons[route.name]}-outline`} size={22} color={color} />;
      },
      tabBarActiveTintColor: COLORS.secondary,
      tabBarInactiveTintColor: COLORS.textLight,
      tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6, borderTopWidth: 0, elevation: 10 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      headerShown: false,
    })}>
      <Tab.Screen name="Home" component={DoctorHomeScreen} />
      <Tab.Screen name="AIChat" component={AIChatScreen} options={{ tabBarLabel: "AI Chat" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="WalletConnect" component={WalletConnectScreen} options={{ headerShown: true, title: "Wallet Login", ...screenOptions }} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { user } = useAuth();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MainTabs" component={user?.role === "doctor" ? DoctorTabs : PatientTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AddRecord" component={AddRecordScreen} options={{ title: "New Record" }} />
      <Stack.Screen name="RecordDetail" component={RecordDetailScreen} options={{ title: "Record Details" }} />
      <Stack.Screen name="DoctorList" component={DoctorListScreen} options={{ title: "Find Doctors" }} />
      <Stack.Screen name="DoctorDetail" component={DoctorDetailScreen} options={{ title: "Doctor Profile" }} />
      <Stack.Screen name="Access" component={AccessScreen} options={{ title: "Access Permissions" }} />
      <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} options={{ title: "My Profile" }} />
      <Stack.Screen name="MyPatients" component={AccessScreen} options={{ title: "My Patients" }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change Password" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="ConnectWallet" component={ConnectWalletScreen} options={{ title: "Connect Wallet" }} />
    </Stack.Navigator>
  );
}

export default function RootNavigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}