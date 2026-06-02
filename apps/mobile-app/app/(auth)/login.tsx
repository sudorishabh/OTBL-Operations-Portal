import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import Toast from "react-native-toast-message";

const loginSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  password: z
    .string({ message: "Password is required" })
    .min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      Toast.show({
        type: "success",
        text1: "Welcome back!",
        text2: "Successfully logged in",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: error?.message || "Invalid email or password",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inner}>
          <View style={styles.branding}>
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>OTBL</Text>
              </View>
            </View>
            <Text style={styles.title}>ONGC TERI Biotech Limited</Text>
            <Text style={styles.subtitle}>Management System</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardDescription}>
              Enter your credentials to access your account
            </Text>

            <Controller
              control={control}
              name='email'
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label='Email Address'
                  placeholder='your.email@example.com'
                  keyboardType='email-address'
                  autoComplete='email'
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name='password'
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label='Password'
                  placeholder='••••••••'
                  secureTextEntry
                  autoComplete='password'
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <View style={styles.forgotContainer}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </View>

            <Button
              title='Sign In'
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              style={styles.signInButton}
            />
          </View>

          <Text style={styles.footer}>
            © {new Date().getFullYear()} OTBL. All rights reserved.{"\n"}
            Protected by industry-leading security.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eff6ff",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  branding: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 48,
    backgroundColor: Colors.accent[900],
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.gray[700],
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.gray[500],
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.gray[700],
    textAlign: "center",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: "center",
    marginBottom: 24,
  },
  forgotContainer: {
    alignItems: "flex-end",
    marginBottom: 20,
    marginTop: -8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.accent[700],
  },
  signInButton: {
    marginTop: 4,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.gray[400],
    marginTop: 32,
    lineHeight: 18,
  },
});
