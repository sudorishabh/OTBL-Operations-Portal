import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, Users2, ChevronRight, MapPin } from "lucide-react-native";
import Badge from "@/components/ui/Badge";
import { Colors } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { capitalize } from "@/lib/utils";

export default function ClientsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, refetch, isRefetching } =
    trpc.clientQuery.getClients.useQuery({});

  const clients = data || [];

  const filteredClients = clients.filter((client: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.city?.toLowerCase().includes(query) ||
      client.state?.toLowerCase().includes(query)
    );
  });

  const renderClient = useCallback(
    ({ item }: { item: any }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/(app)/client/${item.id}`)}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Users2
              size={18}
              color={Colors.info}
            />
          </View>
          <View style={styles.cardHeaderText}>
            <Text
              style={styles.cardName}
              numberOfLines={1}>
              {capitalize(item.name)}
            </Text>
            <Badge
              label={item.status}
              variant={item.status === "active" ? "success" : "error"}
            />
          </View>
          <ChevronRight
            size={18}
            color={Colors.gray[400]}
          />
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <MapPin
              size={14}
              color={Colors.gray[400]}
            />
            <Text style={styles.metaText}>
              {capitalize(item.city || "")}, {capitalize(item.state || "")}
            </Text>
          </View>
          <Text style={styles.metaTextLight}>{item.email}</Text>
        </View>
      </TouchableOpacity>
    ),
    [router],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clients</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search
          size={18}
          color={Colors.gray[400]}
        />
        <TextInput
          style={styles.searchInput}
          placeholder='Search clients...'
          placeholderTextColor={Colors.gray[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size='large'
            color={Colors.primary[600]}
          />
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderClient}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Users2
                size={48}
                color={Colors.gray[300]}
              />
              <Text style={styles.emptyText}>No clients found</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardHeaderText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.gray[800],
    flex: 1,
    marginRight: 8,
  },
  cardMeta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  metaTextLight: {
    fontSize: 12,
    color: Colors.gray[400],
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
