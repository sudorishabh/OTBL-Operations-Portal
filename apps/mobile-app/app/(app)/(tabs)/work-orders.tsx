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
import { Search, FileText, ChevronRight } from "lucide-react-native";

import Badge from "@/components/ui/Badge";
import { Colors } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";

export default function WorkOrdersScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, refetch, isRefetching } =
    trpc.workOrderQuery.getWorkOrders.useQuery();

  const workOrders = data || [];

  const filteredWorkOrders = workOrders.filter((wo: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      wo.title?.toLowerCase().includes(query) ||
      wo.code?.toLowerCase().includes(query) ||
      wo.status?.toLowerCase().includes(query)
    );
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const renderWorkOrder = useCallback(
    ({ item }: { item: any }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/(app)/work-order/${item.id}`)}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <FileText
              size={18}
              color={Colors.primary[600]}
            />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardCode}>{item.code}</Text>
            <Badge
              label={item.status}
              variant={getStatusVariant(item.status) as any}
            />
          </View>
          <ChevronRight
            size={18}
            color={Colors.gray[400]}
          />
        </View>
        <Text
          style={styles.cardTitle}
          numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>
            Start: {formatDate(item.start_date)}
          </Text>
          <Text style={styles.metaText}>End: {formatDate(item.end_date)}</Text>
        </View>
      </TouchableOpacity>
    ),
    [router],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Work Orders</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search
          size={18}
          color={Colors.gray[400]}
        />
        <TextInput
          style={styles.searchInput}
          placeholder='Search work orders...'
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
          data={filteredWorkOrders}
          renderItem={renderWorkOrder}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <FileText
                size={48}
                color={Colors.gray[300]}
              />
              <Text style={styles.emptyText}>No work orders found</Text>
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
    backgroundColor: "#dcfce7",
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
  cardCode: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.accent[700],
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.gray[800],
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    fontSize: 12,
    color: Colors.gray[500],
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
