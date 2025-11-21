import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Text, 
  StyleSheet, 
  Modal, 
  FlatList, 
  TouchableWithoutFeedback, 
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { createUserWithEmailAndPassword } from "firebase/auth";
import authfirebase from '../../../services/firebaseAuth';
import { Ionicons } from '@expo/vector-icons';

import { API_URL } from "../../constants/config";

const { width, height } = Dimensions.get('window');

// List of Sri Lankan districts
const districts = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa",
  "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

export default function InfoFormScreen({ route, navigation }) {
  const { userId, email, password, name } = route.params;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const buttonScale = React.useRef(new Animated.Value(1)).current;
  const modalAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const openModal = () => {
    setDropdownVisible(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDropdownVisible(false);
      setSearchText('');
    });
  };

  const filteredDistricts = districts.filter(d => 
    d.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!phoneNumber.trim() || !selectedDistrict) {
      Alert.alert("Incomplete Information", "Please fill all required fields to continue.");
      return;
    }

    if (phoneNumber.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number.");
      return;
    }

    animateButton();
    setIsLoading(true);

    try {
      // Firebase registration
      const userCredential = await createUserWithEmailAndPassword(authfirebase, email, password);
      const firebaseUid = userCredential.user.uid;

      // Update MongoDB
      const response = await fetch(
        `${API_URL}/api/auth/${userId}/updateProfile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            phoneNumber, 
            bio, 
            address: selectedDistrict, 
            firebaseUid,
            name
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert("🎉 Welcome to RevoMart!", "Your profile is complete and ready to go!");
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        Alert.alert("Update Failed", data.message || "Please try again.");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Registration Error", error.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const modalTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0]
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Background Elements */}
      <View style={styles.backgroundOrb} />
      <View style={[styles.backgroundOrb, styles.backgroundOrb2]} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>RM</Text>
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Just a few more details to personalize your experience</Text>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.progressText}>Step 2 of 2</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Phone Number Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.phoneWrapper}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+94</Text>
                </View>
                <TextInput
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#8E8E93"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Bio Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bio (Optional)</Text>
              <View style={styles.bioContainer}>
                <TextInput
                  placeholder="Tell us a bit about yourself..."
                  value={bio}
                  onChangeText={setBio}
                  style={styles.bioInput}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#8E8E93"
                  maxLength={150}
                />
                <Text style={styles.charCount}>{bio.length}/150</Text>
              </View>
            </View>

            {/* District Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                District <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity 
                style={styles.dropdownTrigger}
                onPress={openModal}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownText, !selectedDistrict && styles.placeholderText]}>
                  {selectedDistrict || "Select your district"}
                </Text>
                <Ionicons 
                  name={dropdownVisible ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#8E8E93" 
                />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]} 
                onPress={handleSubmit}
                activeOpacity={0.9}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="reload" size={20} color="#FFFFFF" style={styles.loadingIcon} />
                    <Text style={styles.buttonText}>Completing Profile...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.buttonText}>Complete Profile</Text>
                    <View style={styles.buttonIcon}>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* District Selection Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContainer,
                { transform: [{ translateY: modalTranslateY }] }
              ]}
            >
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select District</Text>
                    <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>

                  {/* Search Input */}
                  <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
                    <TextInput
                      placeholder="Search districts..."
                      value={searchText}
                      onChangeText={setSearchText}
                      style={styles.searchInput}
                      placeholderTextColor="#8E8E93"
                      autoFocus
                    />
                  </View>

                  {/* Districts List */}
                  <FlatList
                    data={filteredDistricts}
                    keyExtractor={(item) => item}
                    showsVerticalScrollIndicator={false}
                    style={styles.districtList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.districtItem,
                          selectedDistrict === item && styles.districtItemSelected
                        ]}
                        onPress={() => {
                          setSelectedDistrict(item);
                          closeModal();
                        }}
                      >
                        <Text style={[
                          styles.districtItemText,
                          selectedDistrict === item && styles.districtItemTextSelected
                        ]}>
                          {item}
                        </Text>
                        {selectedDistrict === item && (
                          <Ionicons name="checkmark" size={20} color="#2F6F61" />
                        )}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.noResultsText}>No districts found</Text>
                    }
                  />
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A0A0C',
    position: 'relative',
  },
  backgroundOrb: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#1A1D21',
    top: -width * 0.3,
    right: -width * 0.4,
    opacity: 0.6,
  },
  backgroundOrb2: {
    backgroundColor: '#2F6F61',
    top: 'auto',
    bottom: -width * 0.5,
    left: -width * 0.3,
    right: 'auto',
    opacity: 0.3,
  },
  scrollContainer: { 
    flexGrow: 1, 
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(47, 111, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(47, 111, 97, 0.5)',
    marginBottom: 25,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2F6F61',
    letterSpacing: -1,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    textAlign: 'center', 
    marginBottom: 8,
  },
  subtitle: { 
    fontSize: 16, 
    color: '#8E8E93', 
    textAlign: 'center', 
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  progressContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2F6F61',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 4,
  },
  required: {
    color: '#FF3B30',
  },
  phoneWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    backgroundColor: 'rgba(47, 111, 97, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 17,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRightWidth: 0,
  },
  countryCodeText: {
    color: '#2F6F61',
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    flex: 1,
    height: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 0,
  },
  bioContainer: {
    position: 'relative',
  },
  bioInput: {
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textAlignVertical: 'top',
  },
  charCount: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    fontSize: 12,
    color: '#8E8E93',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#8E8E93',
  },
  button: { 
    width: '100%', 
    backgroundColor: '#2F6F61', 
    paddingVertical: 18, 
    borderRadius: 16, 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.4)',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 17, 
    fontWeight: '700', 
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIcon: {
    marginRight: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1A1D21',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#FFFFFF',
    fontSize: 16,
  },
  districtList: {
    maxHeight: height * 0.4,
  },
  districtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  districtItemSelected: {
    backgroundColor: 'rgba(47, 111, 97, 0.1)',
    borderRadius: 8,
  },
  districtItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  districtItemTextSelected: {
    color: '#2F6F61',
    fontWeight: '600',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 16,
    paddingVertical: 20,
  },
});