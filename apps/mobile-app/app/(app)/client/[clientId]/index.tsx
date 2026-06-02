import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Building2, Mail, Phone, MapPin } from "lucide-react-native";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import { Colors } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { capitalize } from "@/lib/utils";

export default function ClientDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();

  const { data, isLoading, refetch, isRefetching } =
    trpc.clientQuery.getClient.useQuery({
      clientId: parseInt(clientId!),
    });

  const client = data?.client;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size='large'
          color={Colors.primary[600]}
        />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.centered}>
        <Building2
          size={48}
          color={Colors.gray[300]}
        />
        <Text style={styles.emptyText}>Client not found</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper
      refreshing={isRefetching}
      onRefresh={refetch}>
      <Card style={styles.headerCard}>
        <View style={styles.clientHeader}>
          <View style={styles.clientAvatar}>
            <Building2
              size={24}
              color={Colors.info}
            />
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{capitalize(client.name)}</Text>
            <Badge
              label={client.status}
              variant={client.status === "active" ? "success" : "error"}
            />
          </View>
        </View>
      </Card>

      <Card
        title='Contact Details'
        style={styles.section}>
        <View style={styles.detailRow}>
          <Mail
            size={16}
            color={Colors.gray[500]}
          />
          <Text style={styles.detailText}>{client.email || "N/A"}</Text>
        </View>
        <View style={styles.detailRow}>
          <Phone
            size={16}
            color={Colors.gray[500]}
          />
          <Text style={styles.detailText}>{client.mobile || "N/A"}</Text>
        </View>
        <View style={styles.detailRow}>
          <MapPin
            size={16}
            color={Colors.gray[500]}
          />
          <Text style={styles.detailText}>
            {client.address
              ? `${client.address}, ${capitalize(client.city || "")}, ${capitalize(client.state || "")}`
              : "N/A"}
          </Text>
        </View>
      </Card>

      <Card
        title='Business Details'
        style={styles.section}>
        <DetailField
          label='GST Number'
          value={client.gst_no || "N/A"}
        />
        {client.description && (
          <DetailField
            label='Description'
            value={client.description}
          />
        )}
      </Card>
    </ScreenWrapper>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.gray[50],
  },
  emptyText: {
    fontSize: 15,
    color: Colors.gray[400],
    marginTop: 12,
  },
  headerCard: {
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
  },
  clientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  clientInfo: {
    flex: 1,
    gap: 6,
  },
  clientName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.gray[900],
  },
  section: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  detailText: {
    fontSize: 14,
    color: Colors.gray[700],
    flex: 1,
  },
  fieldContainer: {
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.gray[500],
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    color: Colors.gray[800],
  },
});
