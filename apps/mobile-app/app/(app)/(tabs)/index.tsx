import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  Users2,
  Building2,
  FileText,
  Tent,
  ChevronRight,
} from "lucide-react-native";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import { capitalize, getInitials } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const quickActions = [
    {
      title: "Work Orders",
      subtitle: "Manage work orders",
      icon: FileText,
      color: Colors.primary[600],
      bgColor: "#dcfce7",
      onPress: () => router.push("/(app)/(tabs)/work-orders"),
    },
    {
      title: "Clients",
      subtitle: "Client management",
      icon: Users2,
      color: Colors.info,
      bgColor: "#dbeafe",
      onPress: () => router.push("/(app)/(tabs)/clients"),
    },
    {
      title: "Offices & Sites",
      subtitle: "View offices and sites",
      icon: Tent,
      color: Colors.accent[700],
      bgColor: "#cffafe",
      onPress: () => router.push("/(app)/office-site"),
    },
    {
      title: "User Management",
      subtitle: "Manage users",
      icon: Building2,
      color: Colors.warning,
      bgColor: "#fef9c3",
      onPress: () => router.push("/(app)/user"),
    },
  ];

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>
            {user?.name ? capitalize(user.name) : "User"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={logout}>
          <Text style={styles.avatarText}>
            {user?.name ? getInitials(user.name) : "?"}
          </Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.name ? getInitials(user.name) : "?"}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userNameLarge}>
              {user?.name ? capitalize(user.name) : "User"}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.badgeRow}>
              <Badge
                label={user?.role || "unknown"}
                variant={user?.role === "admin" ? "info" : "default"}
              />
              <Badge
                label={user?.status || "unknown"}
                variant={user?.status === "active" ? "success" : "error"}
              />
            </View>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.title}
            style={styles.actionCard}
            onPress={action.onPress}
            activeOpacity={0.7}>
            <View
              style={[styles.actionIcon, { backgroundColor: action.bgColor }]}>
              <action.icon
                size={22}
                color={action.color}
              />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            <ChevronRight
              size={16}
              color={Colors.gray[400]}
              style={styles.actionChevron}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.gray[900],
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent[900],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  userCard: {
    marginBottom: 28,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  userAvatarText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 20,
  },
  userDetails: {
    flex: 1,
  },
  userNameLarge: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.gray[900],
  },
  userEmail: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.gray[800],
    marginBottom: 14,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "47.5%",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gray[800],
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  actionChevron: {
    position: "absolute",
    top: 16,
    right: 14,
  },
});
