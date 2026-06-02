import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='(tabs)' />
      <Stack.Screen
        name='user/index'
        options={{
          headerShown: true,
          title: "User Management",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name='office-site/index'
        options={{
          headerShown: true,
          title: "Offices & Sites",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name='client/[clientId]/index'
        options={{
          headerShown: true,
          title: "Client Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name='work-order/[workOrderId]/index'
        options={{
          headerShown: true,
          title: "Work Order Details",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
