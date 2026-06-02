import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Users,
  Tent,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { capitalize, getInitials } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

type MenuItem = {
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  onPress: () => void;
  roles?: string[];
};

export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    {
      title: "User Management",
      subtitle: "Manage users and roles",
      icon: Users,
      color: Colors.warning,
      bgColor: "#fef9c3",
      onPress: () => router.push("/(app)/user"),
      roles: ["admin", "office_manager"],
    },
    {
      title: "Offices & Sites",
      subtitle: "View and manage offices",
      icon: Tent,
      color: Colors.accent[700],
      bgColor: "#cffafe",
      onPress: () => router.push("/(app)/office-site"),
    },
    {
      title: "Profile",
      subtitle: "View your profile",
      icon: User,
      color: Colors.primary[600],
      bgColor: "#dcfce7",
      onPress: () => {},
    },
    {
      title: "Settings",
      subtitle: "App preferences",
      icon: Settings,
      color: Colors.gray[600],
      bgColor: Colors.gray[100],
      onPress: () => {},
    },
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return user?.role ? item.roles.includes(user.role) : false;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.name ? getInitials(user.name) : "?"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.name ? capitalize(user.name) : "User"}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.profileBadges}>
              <Badge
                label={user?.role || "unknown"}
                variant='info'
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          {visibleMenuItems.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.menuItem,
                index === visibleMenuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
              activeOpacity={0.6}>
              <View
                style={[
                  styles.menuItemIcon,
                  { backgroundColor: item.bgColor },
                ]}>
                <item.icon
                  size={20}
                  color={item.color}
                />
              </View>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight
                size={18}
                color={Colors.gray[400]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.6}>
          <LogOut
            size={20}
            color={Colors.error}
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>OTBL Management v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.gray[900],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent[900],
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  profileAvatarText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 20,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.gray[900],
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 2,
  },
  profileBadges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.gray[800],
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.error,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.gray[400],
  },
});
