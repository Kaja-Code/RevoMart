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
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layouts";

const { width } = Dimensions.get("window");

// Sri Lankan Districts
const SRI_LANKAN_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo",
  "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara",
  "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar",
  "Matale", "Matara", "Moneragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

export default function AddProductScreen({ navigation }) {
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("good");
  const [price, setPrice] = useState("");
  const [isForSwap, setIsForSwap] = useState(false);
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/categories`);
        setCategories(res.data || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Request permissions on component mount
  useEffect(() => {
    (async () => {
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      
      if (galleryStatus.status !== 'granted' || cameraStatus.status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera and gallery permissions to make this work!');
      }
    })();
  }, []);

  // Filter districts based on search query
  const filteredDistricts = SRI_LANKAN_DISTRICTS.filter(district =>
    district.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pick images from gallery
  const pickImagesFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      
      if (!result.canceled) {
        const uris = result.assets.map((a) => a.uri);
        setImages((prev) => [...prev, ...uris].slice(0, 5)); // Limit to 5 images
      }
    } catch (err) {
      console.error("ImagePicker error:", err);
      Alert.alert("Error", "Could not pick images");
    } finally {
      setShowImageSourceModal(false);
    }
  };

  // Take photo with camera
  const takePhotoWithCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        aspect: [4, 3],
      });
      
      if (!result.canceled) {
        setImages((prev) => [...prev, result.assets[0].uri].slice(0, 5));
      }
    } catch (err) {
      console.error("Camera error:", err);
      Alert.alert("Error", "Could not take photo");
    } finally {
      setShowImageSourceModal(false);
    }
  };

  // Show image source selection modal
  const showImageSourceOptions = () => {
    if (images.length >= 5) {
      Alert.alert("Limit Reached", "You can only add up to 5 images.");
      return;
    }
    setShowImageSourceModal(true);
  };

  const uploadImageToCloudinary = async (uri) => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: `photo_${Date.now()}.jpg`,
    });
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
    if (
      !title ||
      !categoryId ||
      (categoryId === "other" && !customCategory) ||
      !condition ||
      !address ||
      !district ||
      !price || 
      images.length === 0
    ) {
      Alert.alert("Missing Information", "Please fill all required fields and add at least 1 image");
      return;
    }

    if (images.length > 5) {
      Alert.alert("Too many images", "Please select up to 5 images only");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const uploadedUrls = [];
      const totalImages = images.length;
      
      for (let i = 0; i < images.length; i++) {
        const url = await uploadImageToCloudinary(images[i]);
        uploadedUrls.push(url);
        setUploadProgress(Math.round(((i + 1) / totalImages) * 100));
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
          address: `${address}, ${district}`, // Combined address and district
          imagesUrls: uploadedUrls,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Product added successfully!");
      
      // Automatically clear form after success
      resetForm();
      navigation.goBack();
    } catch (err) {
      console.error("Backend error:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to add product. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
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
    setDistrict("");
    setImages([]);
    setSearchQuery("");
  };

  const conditionLabels = {
    new: "Brand New",
    like_new: "Like New", 
    good: "Good",
    fair: "Fair",
    poor: "Poor"
  };

  // Loading Overlay Component
  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6F61" />
        <Text style={styles.loadingTitle}>Publishing Your Product</Text>
        <Text style={styles.loadingSubtitle}>Please wait while we upload your images and create your listing...</Text>
        
        {uploadProgress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${uploadProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{uploadProgress}% Uploaded</Text>
          </View>
        )}
        
        <Text style={styles.loadingTip}>
          {uploadProgress < 50 ? "📸 Uploading images..." : 
           uploadProgress < 100 ? "🔄 Processing your listing..." : 
           "🎉 Almost done!"}
        </Text>
      </View>
    </View>
  );

  // Image Source Modal
  const ImageSourceModal = () => (
    <Modal
      visible={showImageSourceModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowImageSourceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Photo</Text>
          <Text style={styles.modalSubtitle}>Choose how you want to add photos</Text>
          
          <TouchableOpacity 
            style={[styles.modalOption, styles.modalOptionPrimary]} 
            onPress={takePhotoWithCamera}
          >
            <View style={[styles.modalOptionIcon, styles.modalOptionIconPrimary]}>
              <Text style={styles.modalOptionIconText}>📷</Text>
            </View>
            <View style={styles.modalOptionTextContainer}>
              <Text style={styles.modalOptionText}>Take Photo</Text>
              <Text style={styles.modalOptionSubtext}>Use your camera to take a new photo</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalOption, styles.modalOptionPrimary]} 
            onPress={pickImagesFromGallery}
          >
            <View style={[styles.modalOptionIcon, styles.modalOptionIconPrimary]}>
              <Text style={styles.modalOptionIconText}>🖼️</Text>
            </View>
            <View style={styles.modalOptionTextContainer}>
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
              <Text style={styles.modalOptionSubtext}>Select from your existing photos</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalCancel} 
            onPress={() => setShowImageSourceModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // District Selection Modal
  const DistrictModal = () => (
    <Modal
      visible={showDistrictModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowDistrictModal(false);
        setSearchQuery("");
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.districtModalContent]}>
          <Text style={styles.modalTitle}>Select District</Text>
          <Text style={styles.modalSubtitle}>Choose your district location</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search districts..."
              placeholderTextColor="#9BA1A6"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery("")}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView 
            style={styles.districtList}
            showsVerticalScrollIndicator={false}
          >
            {filteredDistricts.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No districts found</Text>
                <Text style={styles.noResultsSubtext}>Try a different search term</Text>
              </View>
            ) : (
              filteredDistricts.map((dist) => (
                <TouchableOpacity
                  key={dist}
                  style={[
                    styles.districtOption,
                    district === dist && styles.districtOptionSelected
                  ]}
                  onPress={() => {
                    setDistrict(dist);
                    setShowDistrictModal(false);
                    setSearchQuery("");
                  }}
                >
                  <Text style={[
                    styles.districtOptionText,
                    district === dist && styles.districtOptionTextSelected
                  ]}>
                    {dist}
                  </Text>
                  {district === dist && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.modalCancel} 
            onPress={() => {
              setShowDistrictModal(false);
              setSearchQuery("");
            }}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Layout>
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add New Product</Text>
          <Text style={styles.headerSubtitle}>Fill in the details to list your item</Text>
        </View>

        {/* Product Images */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Product Images</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Add up to 5 photos (first image will be the cover)</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.imagesContainer}
            contentContainerStyle={styles.imagesContent}
          >
            {images.map((uri, idx) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
                {idx === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
            
            {images.length < 5 && (
              <TouchableOpacity 
                style={styles.addImageButton}
                onPress={showImageSourceOptions}
              >
                <View style={styles.addImageIcon}>
                  <Text style={styles.addImageIconText}>+</Text>
                </View>
                <Text style={styles.addImageText}>Add Photo</Text>
                <Text style={styles.addImageSubtext}>{5 - images.length} remaining</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          
          <View style={styles.imageCountContainer}>
            <Text style={styles.imageCount}>{images.length}/5 photos added</Text>
            {images.length === 0 && (
              <Text style={styles.imageWarning}>At least 1 photo is required</Text>
            )}
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Product Title</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="What are you selling?"
              placeholderTextColor="#9BA1A6"
              value={title}
              onChangeText={setTitle}
              maxLength={60}
            />
            <View style={styles.charCountContainer}>
              <Text style={styles.charCount}>{title.length}/60 characters</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.optionalText}>(Optional)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your product in detail..."
              placeholderTextColor="#9BA1A6"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
            />
            <View style={styles.charCountContainer}>
              <Text style={styles.charCount}>{description.length}/500 characters</Text>
            </View>
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Category</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
          >
            <View style={styles.chipGroup}>
              {categories?.map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[
                    styles.chip,
                    categoryId === cat._id && styles.chipSelected,
                  ]}
                  onPress={() => setCategoryId(cat._id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      categoryId === cat._id && styles.chipTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {/* <TouchableOpacity
                style={[
                  styles.chip,
                  categoryId === "other" && styles.chipSelected,
                ]}
                onPress={() => setCategoryId("other")}
              >
                <Text
                  style={[
                    styles.chipText,
                    categoryId === "other" && styles.chipTextSelected,
                  ]}
                >
                  Other
                </Text>
              </TouchableOpacity> */}
            </View>
          </ScrollView>

          {/* {categoryId === "other" && (
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Custom Category</Text>
                <Text style={styles.requiredAsterisk}>*</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Specify your category"
                placeholderTextColor="#9BA1A6"
                value={customCategory}
                onChangeText={setCustomCategory}
              />
            </View>
          )} */}
        </View>

        {/* Condition */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Condition</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          
          <View style={styles.chipGroup}>
            {["new", "like_new", "good", "fair", "poor"].map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.conditionChip,
                  condition === c && styles.conditionChipSelected,
                ]}
                onPress={() => setCondition(c)}
              >
                <Text
                  style={[
                    styles.conditionChipText,
                    condition === c && styles.conditionChipTextSelected,
                  ]}
                >
                  {conditionLabels[c]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price & Swap */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Price (LKR)</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          
          <View style={styles.inputGroup}>
            {/* <View style={styles.labelContainer}>
              <Text style={styles.label}>Price (LKR)</Text>
              
            </View> */}
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="0.00"
                placeholderTextColor="#9BA1A6"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.swapContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Open for Swap?</Text>
              <Text style={styles.optionalText}>(Optional)</Text>
            </View>
            <View style={styles.swapOptions}>
              <TouchableOpacity
                style={[
                  styles.swapOption,
                  isForSwap && styles.swapOptionSelected,
                ]}
                onPress={() => setIsForSwap(true)}
              >
                <Text style={[
                  styles.swapOptionText,
                  isForSwap && styles.swapOptionTextSelected
                ]}>🤝 Yes, Swap</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.swapOption,
                  !isForSwap && styles.swapOptionSelected,
                ]}
                onPress={() => setIsForSwap(false)}
              >
                <Text style={[
                  styles.swapOptionText,
                  !isForSwap && styles.swapOptionTextSelected
                ]}>💰 Sale Only</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>District</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.districtSelector,
                !district && styles.districtSelectorEmpty
              ]}
              onPress={() => setShowDistrictModal(true)}
            >
              <View style={styles.districtSelectorContent}>
                <Text style={district ? styles.districtSelectedText : styles.districtPlaceholder}>
                  {district || "Select your district"}
                </Text>
                <View style={styles.districtSelectorIcon}>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your detailed address (street, city, etc.)"
              placeholderTextColor="#9BA1A6"
              value={address}
              onChangeText={setAddress}
            />
            <Text style={styles.locationHelperText}>
              Your full address will be shown as: {address ? `${address}, ${district || 'Selected District'}` : 'Address, District'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
            onPress={submitProduct}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? "Publishing..." : "Publish Product"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.clearBtn} 
            onPress={resetForm}
            disabled={isSubmitting}
          >
            <Text style={styles.clearText}>🗑️ Clear All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By publishing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isSubmitting && <LoadingOverlay />}

      {/* Image Source Modal */}
      <ImageSourceModal />

      {/* District Modal */}
      <DistrictModal />
    </KeyboardAvoidingView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 14,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
    fontWeight: "400",
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    fontWeight: "400",
  },
  requiredBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF6F61",
    backgroundColor: "#FFF0EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontWeight: "600",
    fontSize: 16,
    color: "#2F2F2F",
    marginRight: 4,
  },
  requiredAsterisk: {
    color: "#FF6F61",
    fontWeight: "600",
  },
  optionalText: {
    fontSize: 12,
    color: "#9BA1A6",
    fontWeight: "400",
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "400",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  charCountContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: "#9BA1A6",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    paddingLeft: 16,
  },
  currencySymbol: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  chipScroll: {
    marginHorizontal: -24,
    // paddingHorizontal: 24,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    
  },
  chip: {
    backgroundColor: "#F8F9FA",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  chipSelected: {
    backgroundColor: "#2F6F61",
    borderColor: "#2F6F61",
  },
  chipText: {
    color: "#666",
    fontWeight: "500",
    fontSize: 14,
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  conditionChip: {
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    flex: 1,
    minWidth: (width - 72) / 3,
    alignItems: "center",
  },
  conditionChipSelected: {
    backgroundColor: "#FF6F61",
    borderColor: "#FF6F61",
  },
  conditionChipText: {
    color: "#666",
    fontWeight: "500",
    fontSize: 14,
    textAlign: "center",
  },
  conditionChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  swapContainer: {
    marginTop: 16,
  },
  swapOptions: {
    flexDirection: "row",
    gap: 12,
  },
  swapOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  swapOptionSelected: {
    backgroundColor: "#2F6F61",
    borderColor: "#2F6F61",
  },
  swapOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  swapOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  imagesContainer: {
    marginBottom: 12,
    paddingTop:8,
  },
  imagesContent: {
    paddingRight: 24,
  },
  imageWrapper: {
    position: "relative",
    marginRight: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
  },
  removeImageBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  removeImageText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  coverBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  coverBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  addImageButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderStyle: "dashed",
    padding: 16,
  },
  addImageIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E9ECEF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  addImageIconText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "600",
  },
  addImageText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  addImageSubtext: {
    fontSize: 11,
    color: "#9BA1A6",
    textAlign: "center",

  },
  imageCountContainer: {
    alignItems: "center",
  },
  imageCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  imageWarning: {
    fontSize: 12,
    color: "#FF6F61",
    marginTop: 4,
    fontWeight: "500",
  },
  // District Selector Styles
  districtSelector: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  districtSelectorEmpty: {
    borderColor: "#FF6F61",
    backgroundColor: "#FFF0EE",
  },
  districtSelectorContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  districtPlaceholder: {
    color: "#9BA1A6",
    fontSize: 16,
  },
  districtSelectedText: {
    color: "#1A1A1A",
    fontSize: 16,
    fontWeight: "500",
  },
  districtSelectorIcon: {
    paddingLeft: 8,
  },
  dropdownIcon: {
    color: "#666",
    fontSize: 12,
  },
  locationHelperText: {
    fontSize: 12,
    color: "#9BA1A6",
    marginTop: 4,
    fontStyle: "italic",
  },
  actionButtons: {
    padding: 24,
    gap: 12,
  },
  submitBtn: {
    backgroundColor: "#FF6F61",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#FF6F61",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: "#FFB4A8",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
  },
  clearBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
  },
  clearText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#9BA1A6",
    textAlign: "center",
    lineHeight: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  districtModalContent: {
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    marginBottom: 12,
  },
  modalOptionPrimary: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E9ECEF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalOptionIconPrimary: {
    backgroundColor: "#2F6F61",
  },
  modalOptionIconText: {
    fontSize: 18,
  },
  modalOptionTextContainer: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: "#666",
  },
  modalCancel: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#E9ECEF",
    alignItems: "center",
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  // Search Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  searchIconContainer: {
    paddingRight: 8,
  },
  searchIcon: {
    fontSize: 16,
    color: "#666",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1A1A1A",
  },
  clearSearchButton: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  districtList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  districtOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  districtOptionSelected: {
    backgroundColor: "#F0F9FF",
  },
  districtOptionText: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  districtOptionTextSelected: {
    color: "#2F6F61",
    fontWeight: "600",
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2F6F61",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedIndicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  noResultsContainer: {
    padding: 40,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#9BA1A6",
  },
  // Loading Overlay Styles
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 24,
    alignItems: "center",
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    minWidth: width * 0.8,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  progressContainer: {
    width: "100%",
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF6F61",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    textAlign: "center",
  },
  loadingTip: {
    fontSize: 14,
    color: "#2F6F61",
    fontWeight: "500",
    textAlign: "center",
    fontStyle: "italic",
  },
  
});