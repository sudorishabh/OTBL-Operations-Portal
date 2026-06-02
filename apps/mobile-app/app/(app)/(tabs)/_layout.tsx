import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { LayoutDashboard, FileText, Users2, Menu } from "lucide-react-native";
import { Colors } from "@/lib/constants";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary[600],
        tabBarInactiveTintColor: Colors.gray[400],
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
      }}>
      <Tabs.Screen
        name='index'
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='work-orders'
        options={{
          title: "Work Orders",
          tabBarIcon: ({ color, size }) => (
            <FileText
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='clients'
        options={{
          title: "Clients",
          tabBarIcon: ({ color, size }) => (
            <Users2
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='more'
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Menu
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    paddingTop: 8,
    height: Platform.OS === "ios" ? 85 : 65,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  tabIcon: {
    marginBottom: -2,
  },
});
