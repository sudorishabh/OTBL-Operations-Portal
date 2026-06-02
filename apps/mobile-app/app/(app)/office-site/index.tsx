import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Search, Building2, MapPin, Tent } from "lucide-react-native";
import Badge from "@/components/ui/Badge";
import { Colors } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { capitalize } from "@/lib/utils";

export default function OfficeSiteScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, refetch, isRefetching } =
    trpc.officeQuery.getOffices.useQuery({});

  const offices = data?.offices || [];

  const filteredOffices = offices.filter((office: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      office.name?.toLowerCase().includes(query) ||
      office.city?.toLowerCase().includes(query) ||
      office.state?.toLowerCase().includes(query)
    );
  });

  const renderOffice = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Building2
              size={18}
              color={Colors.accent[700]}
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
        </View>
        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <MapPin
              size={14}
              color={Colors.gray[400]}
            />
            <Text style={styles.metaText}>
              {capitalize(item.city || "")}, {capitalize(item.state || "")}
            </Text>
          </View>
          {item.address && (
            <Text
              style={styles.addressText}
              numberOfLines={1}>
              {item.address}
            </Text>
          )}
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search
          size={18}
          color={Colors.gray[400]}
        />
        <TextInput
          style={styles.searchInput}
          placeholder='Search offices...'
          placeholderTextColor={Colors.gray[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {filteredOffices.length} office
          {filteredOffices.length !== 1 ? "s" : ""}
        </Text>
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
          data={filteredOffices}
          renderItem={renderOffice}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Tent
                size={48}
                color={Colors.gray[300]}
              />
              <Text style={styles.emptyText}>No offices found</Text>
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
    marginBottom: 10,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#cffafe",
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
  cardBody: {
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
  addressText: {
    fontSize: 12,
    color: Colors.gray[400],
    paddingLeft: 20,
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
