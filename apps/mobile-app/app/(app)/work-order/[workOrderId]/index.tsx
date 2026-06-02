import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { FileText, Calendar, Building2 } from "lucide-react-native";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import { Colors } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { capitalize, formatDate } from "@/lib/utils";

export default function WorkOrderDetailScreen() {
  const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();

  const { data, isLoading, refetch, isRefetching } =
    trpc.workOrderQuery.getWorkOrder.useQuery({
      id: parseInt(workOrderId!),
    });

  const workOrder = data as any;

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

  if (!workOrder) {
    return (
      <View style={styles.centered}>
        <FileText
          size={48}
          color={Colors.gray[300]}
        />
        <Text style={styles.emptyText}>Work order not found</Text>
      </View>
    );
  }

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

  return (
    <ScreenWrapper
      refreshing={isRefetching}
      onRefresh={refetch}>
      <Card style={styles.headerCard}>
        <View style={styles.woHeader}>
          <View style={styles.woIconContainer}>
            <FileText
              size={24}
              color={Colors.primary[600]}
            />
          </View>
          <View style={styles.woInfo}>
            <Text style={styles.woCode}>{workOrder.code}</Text>
            <Badge
              label={workOrder.status}
              variant={getStatusVariant(workOrder.status) as any}
            />
          </View>
        </View>
        <Text style={styles.woTitle}>{workOrder.title}</Text>
      </Card>

      <Card
        title='Details'
        style={styles.section}>
        <DetailRow
          icon={Calendar}
          label='Start Date'
          value={formatDate(workOrder.start_date)}
        />
        <DetailRow
          icon={Calendar}
          label='End Date'
          value={formatDate(workOrder.end_date)}
        />
        {workOrder.agreement_no && (
          <DetailRow
            icon={FileText}
            label='Agreement No.'
            value={workOrder.agreement_no}
          />
        )}
        {workOrder.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descLabel}>Description</Text>
            <Text style={styles.descText}>{workOrder.description}</Text>
          </View>
        )}
      </Card>

      <Card
        title='Associations'
        style={styles.section}>
        {workOrder.office && (
          <DetailRow
            icon={Building2}
            label='Office'
            value={capitalize(
              typeof workOrder.office === "object"
                ? workOrder.office.name
                : workOrder.office || "",
            )}
          />
        )}
        {workOrder.client && (
          <DetailRow
            icon={Building2}
            label='Client'
            value={capitalize(
              typeof workOrder.client === "object"
                ? workOrder.client.name
                : workOrder.client || "",
            )}
          />
        )}
      </Card>
    </ScreenWrapper>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Icon
        size={16}
        color={Colors.gray[500]}
      />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
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
  woHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    marginBottom: 10,
  },
  woIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  woInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  woCode: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.accent[700],
  },
  woTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.gray[800],
    lineHeight: 24,
  },
  section: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.gray[500],
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.gray[800],
  },
  descriptionSection: {
    paddingVertical: 10,
  },
  descLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.gray[500],
    marginBottom: 6,
  },
  descText: {
    fontSize: 14,
    color: Colors.gray[700],
    lineHeight: 20,
  },
});
