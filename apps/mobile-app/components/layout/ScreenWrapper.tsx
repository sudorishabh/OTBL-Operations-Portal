import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ViewStyle,
} from "react-native";
import { Colors } from "@/lib/constants";

interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  backgroundColor?: string;
}

export default function ScreenWrapper({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  backgroundColor = Colors.gray[50],
}: ScreenWrapperProps) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={backgroundColor}
      />
      {scroll ? (
        <ScrollView
          style={[styles.scrollView, style]}
          contentContainerStyle={[
            styles.contentContainer,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary[600]]}
                tintColor={Colors.primary[600]}
              />
            ) : undefined
          }>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.view, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  view: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
