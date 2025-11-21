import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DropDownPicker from "react-native-dropdown-picker";
import colors from "../../constants/colors";
import { API_URL } from "../../constants/config";
import Layout from "../../components/Layouts";

const { width } = Dimensions.get("window");

const DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
  "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Monaragala", "Ratnapura", "Kegalle",
];

export default function ProfileScreen() {
  const { user, userDetails, setUserDetails, logout, refreshUserDetails } = useAuth();
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  const [districtOpen, setDistrictOpen] = useState(false);
  const [district, setDistrict] = useState(userDetails?.address || null);
  const [districtItems, setDistrictItems] = useState(DISTRICTS.map(d => ({ label: d, value: d })));

  useEffect(() => {
    if (userDetails?.address) setDistrict(userDetails.address);
  }, [userDetails?.address]);

  const uploadImageToCloudinary = async (uri) => {
    const data = new FormData();
    data.append("file", { uri, type: "image/jpeg", name: `photo_${Date.now()}.jpg` });
    data.append("upload_preset", "mobile_upload");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dvia7pu9t/image/upload", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!json.secure_url) throw new Error("Cloudinary upload failed");
      return json.secure_url;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUploading(true);
      try {
        const imageUrl = await uploadImageToCloudinary(result.assets[0].uri);
        handleConfirmUpdate("profilePictureUrl", imageUrl);
      } catch {
        Alert.alert("Error", "Image upload failed");
      }
      setImageUploading(false);
    }
  };

  const handleConfirmUpdate = (field, value) => {
    Alert.alert(
      "Confirm Update",
      `Are you sure you want to update this field?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => updateUserField(field, value) },
      ]
    );
  };

  const updateUserField = async (field, value) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/${user.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      
      // Refresh local state from backend
      await refreshUserDetails(user);

      setEditField(null);
      setEditValue("");
      Alert.alert("Success", "Profile updated successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Update failed");
    }
  };

  const handleSave = () => handleConfirmUpdate(editField, editValue);

  if (!userDetails) return <Text style={{ textAlign: "center", marginTop: 50 }}>Loading...</Text>;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <Layout>
    <ScrollView style={styles.container}>
      <View style={styles.profilePicContainer}>
        <TouchableOpacity onPress={handlePickImage} disabled={imageUploading}>
          {userDetails.profilePictureUrl ? (
            <Image source={{ uri: userDetails.profilePictureUrl }} style={styles.profilePic} />
          ) : (
            <MaterialCommunityIcons name="account-circle" size={120} color={colors.primary} />
          )}
          <MaterialCommunityIcons name="camera" size={26} color={colors.primary} style={{ position: "absolute", bottom: 0, right: 5 }} />
        </TouchableOpacity>
        <Text style={styles.username}>{userDetails.username}</Text>
        <Text style={styles.email}>{userDetails.email}</Text>
      </View>

      <View style={styles.infoContainer}>
        {[
          { label: "Username", key: "username", icon: "account" },
          { label: "Phone Number", key: "phoneNumber", icon: "phone" },
          { label: "Bio", key: "bio", icon: "information" },
        ].map(field => (
          <View key={field.key} style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name={field.icon} size={24} color={colors.primary} />
              {editField === field.key ? (
                <>
                  <TextInput
                    value={editValue}
                    onChangeText={setEditValue}
                    style={styles.input}
                    placeholder={`Enter ${field.label}`}
                  />
                  <TouchableOpacity onPress={handleSave}>
                    <MaterialCommunityIcons name="check" size={24} color="green" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditField(null)}>
                    <MaterialCommunityIcons name="close" size={24} color="red" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.infoText}>{userDetails[field.key] || "-"}</Text>
                  <TouchableOpacity onPress={() => { setEditField(field.key); setEditValue(userDetails[field.key] || ""); }}>
                    <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}

        {/* Address Dropdown */}
        <View style={[styles.infoCard, { zIndex: 10 }]}>
          <MaterialCommunityIcons name="map-marker" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <DropDownPicker
              open={districtOpen}
              value={district}
              items={districtItems}
              setOpen={setDistrictOpen}
              setValue={(value) => handleConfirmUpdate("address", value)}
              setItems={setDistrictItems}
              searchable={true}
              placeholder="Select your district"
              style={{ borderColor: colors.primary }}
              dropDownContainerStyle={{ borderColor: colors.primary }}
            />
          </View>
        </View>

        {/* Registration & Last Login */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="calendar-check" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { marginLeft: 10 }]}>
            Registration: {formatDate(userDetails.registrationDate)}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="login" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { marginLeft: 10 }]}>
            Last Login: {formatDate(userDetails.lastLoginDate)}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  profilePicContainer: { alignItems: "center", marginVertical: 20 },
  profilePic: { width: 120, height: 120, borderRadius: 60 },
  username: { fontSize: 22, fontWeight: "bold", color: "#333" },
  email: { fontSize: 16, color: "gray" },
  infoContainer: { paddingHorizontal: 20 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  infoRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  infoText: { fontSize: 16, flex: 1, marginLeft: 10 },
  input: { borderBottomWidth: 1, flex: 1, marginLeft: 10 },
  logoutBtn: {
    marginTop: 30,
    padding: 15,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 40,
  },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
