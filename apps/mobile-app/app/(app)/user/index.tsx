import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Search, User, Mail } from "lucide-react-native";
import Badge from "@/components/ui/Badge";
import { Colors } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { capitalize, getInitials } from "@/lib/utils";

/**
 * User Management screen — mirrors /user page
 */
export default function UserManagementScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, refetch, isRefetching } =
    trpc.userQuery.getAllUser.useQuery({
      page: 1,
      limit: 50,
    });

  const users = data?.users || [];

  const filteredUsers = users.filter((user: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return { bg: "#fee2e2", text: "#991b1b" };
      case "office_manager":
        return { bg: "#dbeafe", text: "#1e40af" };
      case "office_operator":
        return { bg: "#fef3c7", text: "#92400e" };
      case "site_operator":
        return { bg: "#cffafe", text: "#155e75" };
      default:
        return { bg: Colors.gray[100], text: Colors.gray[600] };
    }
  };

  const renderUser = useCallback(({ item }: { item: any }) => {
    const roleColor = getRoleColor(item.role);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: roleColor.bg }]}>
            <Text style={[styles.avatarText, { color: roleColor.text }]}>
              {getInitials(item.name)}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text
              style={styles.cardName}
              numberOfLines={1}>
              {capitalize(item.name)}
            </Text>
            <View style={styles.emailRow}>
              <Mail
                size={12}
                color={Colors.gray[400]}
              />
              <Text style={styles.cardEmail}>{item.email}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Badge
            label={item.role?.replace(/_/g, " ")}
            variant={item.role === "admin" ? "error" : "info"}
          />
          <Badge
            label={item.status}
            variant={item.status === "active" ? "success" : "error"}
          />
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search
          size={18}
          color={Colors.gray[400]}
        />
        <TextInput
          style={styles.searchInput}
          placeholder='Search users...'
          placeholderTextColor={Colors.gray[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size='large'
            color={Colors.primary[600]}
          />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <User
                size={48}
                color={Colors.gray[300]}
              />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: Colors.gray[900],
  },
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statsText: {
    fontSize: 13,
    color: Colors.gray[500],
    fontWeight: "500",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.gray[800],
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  cardEmail: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.gray[400],
    marginTop: 12,
  },
});
