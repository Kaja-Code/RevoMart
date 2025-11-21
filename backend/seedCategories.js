import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";

export default function AddProductScreen({ navigation }) {
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("good");
  const [price, setPrice] = useState("");
  const [isForSwap, setIsForSwap] = useState(false);
  const [address, setAddress] = useState("");
  const [images, setImages] = useState([]);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/categories`);
        setCategories(res.data);
      } catch (err) {
        console.error("Error fetching categories:", err.message);
        Alert.alert("Error", "Failed to fetch categories");
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Pick images from gallery
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to gallery!");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
      });
      if (!result.canceled) {
        const uris = result.assets.map((a) => a.uri);
        setImages((prev) => [...prev, ...uris]);
      }
    } catch (err) {
      console.error("ImagePicker error:", err);
      Alert.alert("Error", "Could not pick images");
    }
  };

  const uploadImageToCloudinary = async (uri) => {
    const data = new FormData();
    data.append("file", { uri, type: "image/jpeg", name: `photo_${Date.now()}.jpg` });
    data.append("upload_preset", "mobile_upload");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dvia7pu9t/image/upload",
        { method: "POST", body: data }
      );
      const json = await res.json();
      if (!json.secure_url) throw new Error("Cloudinary upload failed");
      return json.secure_url;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      throw err;
    }
  };

  const submitProduct = async () => {
    if (!title || (!categoryId && !customCategory) || !condition || !address || images.length === 0) {
      Alert.alert("Error", "Please fill all required fields and add at least 1 image");
      return;
    }

    try {
      const uploadedUrls = [];
      for (const uri of images) {
        const url = await uploadImageToCloudinary(uri);
        uploadedUrls.push(url);
      }

      const token = await user.getIdToken();

      await axios.post(
        `${API_URL}/api/products`,
        {
          categoryId: categoryId === "other" ? customCategory : categoryId,
          title,
          description,
          condition,
          price,
          isForSwap,
          address,
          imagesUrls: uploadedUrls,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Product added successfully!");
      resetForm();
      navigation.goBack();
    } catch (err) {
      console.error("Backend error:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to add product");
    }
  };

  const resetForm = () => {
    setCategoryId("");
    setCustomCategory("");
    setTitle("");
    setDescription("");
    setCondition("good");
    setPrice("");
    setIsForSwap(false);
    setAddress("");
    setImages([]);
  };

  if (loadingCategories) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2f95dc" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} placeholder="Product title" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Product description"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Category</Text>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat._id}
          style={[styles.categoryBtn, categoryId === cat._id && styles.selectedCategory]}
          onPress={() => setCategoryId(cat._id)}
        >
          <Text style={[styles.categoryText, categoryId === cat._id && styles.selectedCategoryText]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}

      {categoryId === "other" && (
        <TextInput
          style={styles.input}
          placeholder="Enter custom category"
          value={customCategory}
          onChangeText={setCustomCategory}
        />
      )}

      <Text style={styles.label}>Condition</Text>
      {["new", "like_new", "good", "fair", "poor"].map((c) => (
        <TouchableOpacity
          key={c}
          style={[styles.conditionBtn, condition === c && styles.selectedCondition]}
          onPress={() => setCondition(c)}
        >
          <Text style={[styles.conditionText, condition === c && styles.selectedConditionText]}>{c}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Price</Text>
      <TextInput style={styles.input} placeholder="Price in LKR" value={price} onChangeText={setPrice} keyboardType="numeric" />

      <Text style={styles.label}>Address</Text>
      <TextInput style={styles.input} placeholder="Your address" value={address} onChangeText={setAddress} />

      <Text style={styles.label}>Swap Preference</Text>
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <TouchableOpacity style={[styles.swapBtn, isForSwap && styles.selectedSwap]} onPress={() => setIsForSwap(true)}>
          <Text style={[styles.swapText, isForSwap && styles.selectedSwapText]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.swapBtn, !isForSwap && styles.selectedSwap]} onPress={() => setIsForSwap(false)}>
          <Text style={[styles.swapText, !isForSwap && styles.selectedSwapText]}>No</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.imageBtn} onPress={pickImages}>
        <Text style={styles.imageBtnText}>Pick Images</Text>
      </TouchableOpacity>

      <ScrollView horizontal>
        {images.map((uri, idx) => (
          <View key={idx} style={{ position: "relative", marginRight: 10 }}>
            <Image source={{ uri }} style={{ width: 100, height: 100, borderRadius: 8 }} />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.submitBtn} onPress={submitProduct}>
        <Text style={styles.submitText}>Submit Product</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: "gray" }]} onPress={resetForm}>
        <Text style={styles.submitText}>Clear All</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontWeight: "bold", marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: "#fff", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#ccc", marginBottom: 10 },
  categoryBtn: { backgroundColor: "#eee", padding: 8, borderRadius: 8, marginBottom: 5 },
  selectedCategory: { backgroundColor: "#2f95dc" },
  categoryText: { color: "#000" },
  selectedCategoryText: { color: "#fff", fontWeight: "bold" },
  conditionBtn: { backgroundColor: "#eee", padding: 8, borderRadius: 8, marginBottom: 5 },
  selectedCondition: { backgroundColor: "#ff6f61" },
  conditionText: { color: "#000" },
  selectedConditionText: { color: "#fff", fontWeight: "bold" },
  swapBtn: { flex: 1, padding: 10, backgroundColor: "#eee", borderRadius: 8, marginRight: 5, alignItems: "center" },
  selectedSwap: { backgroundColor: "#2f95dc" },
  swapText: { color: "#000", fontWeight: "bold" },
  selectedSwapText: { color: "#fff" },
  imageBtn: { backgroundColor: "#2f95dc", padding: 12, borderRadius: 12, marginVertical: 10, alignItems: "center" },
  imageBtnText: { color: "#fff", fontWeight: "bold" },
  submitBtn: { backgroundColor: "#ff6f61", padding: 15, borderRadius: 12, marginTop: 20, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  removeImageBtn: { position: "absolute", top: -8, right: -8, backgroundColor: "red", borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center" },
});
// run backend terminal node seedCategories.js