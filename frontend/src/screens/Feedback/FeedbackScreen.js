import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Dropdown } from 'react-native-element-dropdown';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { submitFeedback } from '../../api/feedbackApi';
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get('window');

// 🎨 Enhanced theme with gradients and modern colors
const theme = {
  primary: "#006D77",
  primaryLight: "#83C5BE",
  accent: "#FFD166",
  accentLight: "#FFE8B5",
  background: "#F8F9FA",
  card: "#FFFFFF",
  border: "#E9ECEF",
  muted: "#6C757D",
  text: "#212529",
  success: "#28A745",
  error: "#DC3545",
};

// Feedback type options
const FEEDBACK_TYPES = [
  { label: 'Bug Report', value: 'bug', icon: 'bug-outline' },
  { label: 'Suggestion', value: 'suggestion', icon: 'lightbulb-outline' },
  { label: 'General', value: 'general', icon: 'message-outline' },
];

export default function FeedbackScreen({ onSubmitted }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [feedbackType, setFeedbackType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please write your feedback before submitting.');
      return;
    }
    if (!feedbackType) {
      Alert.alert('Error', 'Please select a feedback type.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please provide your email address.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      await submitFeedback({
        token,
        email,
        type: feedbackType,
        rating,
        message: feedback.trim(),
      });

      setRating(0);
      setFeedback('');
      setFeedbackType('');

      // Save month info
      const currentMonth = new Date().getMonth();
      await AsyncStorage.setItem(`feedback_last_submitted_month_${user.uid}`, currentMonth.toString());
      await AsyncStorage.removeItem(`feedback_skip_count_${user.uid}`);

      Alert.alert(
        '✅ Success',
        'Thank you for your feedback! We value your input.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSubmitted) onSubmitted();
            },
          },
        ]
      );

    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? Your feedback will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            setRating(0);
            setFeedback('');
            setFeedbackType('');
          },
        },
      ]
    );
  };

  const renderStar = (index) => (
    <TouchableOpacity
      key={index}
      onPress={() => setRating(index + 1)}
      style={styles.star}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={index < rating ? 'star' : 'star-outline'}
        size={36}
        color={index < rating ? theme.accent : '#DEE2E6'}
      />
    </TouchableOpacity>
  );

  const renderDropdownItem = (item) => {
    const iconName = FEEDBACK_TYPES.find(type => type.value === item.value)?.icon;
    
    return (
      <View style={styles.dropdownItem}>
        <MaterialCommunityIcons name={iconName} size={20} color={theme.primary} />
        <Text style={styles.dropdownItemText}>{item.label}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="message-text-outline" size={32} color={theme.primary} />
        </View>
        <Text style={styles.title}>Share Your Feedback</Text>
        <Text style={styles.subtitle}>
          Your thoughts help us make Revomart better for everyone
        </Text>
      </View>

      <View style={styles.card}>
        {/* Star Rating Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="star-circle" size={24} color={theme.accent} />
            <Text style={styles.sectionTitle}>Rate Your Experience</Text>
          </View>
          <View style={styles.starsContainer}>
            {[0, 1, 2, 3, 4].map(renderStar)}
          </View>
          <Text style={styles.ratingText}>
            {rating === 0 ? 'Tap to rate your experience' : `You rated us ${rating} star${rating > 1 ? 's' : ''}`}
          </Text>
        </View>

        {/* Feedback Type Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={theme.primary} />
            <Text style={styles.sectionTitle}>Feedback Type</Text>
          </View>
          <Text style={styles.label}>What would you like to share? *</Text>
          <Dropdown
            style={styles.dropdown}
            data={FEEDBACK_TYPES}
            labelField="label"
            valueField="value"
            placeholder="Select feedback type"
            value={feedbackType}
            onChange={(item) => setFeedbackType(item.value)}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            renderItem={renderDropdownItem}
            renderRightIcon={() => (
              <MaterialCommunityIcons name="chevron-down" size={20} color={theme.muted} />
            )}
          />
        </View>

        {/* Feedback Text Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="pencil-outline" size={24} color={theme.primary} />
            <Text style={styles.sectionTitle}>Your Feedback</Text>
          </View>
          <Text style={styles.label}>Tell us more about your experience *</Text>
          <View style={styles.feedbackInputContainer}>
            <TextInput
              style={styles.feedbackInput}
              placeholder="What's on your mind? Share your thoughts, suggestions, or issues..."
              placeholderTextColor={theme.muted}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <View style={styles.characterCountContainer}>
              <Text style={styles.characterCount}>
                {feedback.length}/1000 characters
              </Text>
            </View>
          </View>
        </View>

        {/* Email Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="email-outline" size={24} color={theme.primary} />
            <Text style={styles.sectionTitle}>Contact Info</Text>
          </View>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@example.com"
            placeholderTextColor={theme.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!user?.email}
          />
          {user?.email && (
            <View style={styles.helpTextContainer}>
              <MaterialCommunityIcons name="information-outline" size={16} color={theme.muted} />
              <Text style={styles.helpText}>Pre-filled from your account</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={submitting}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color={theme.muted} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              submitting && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <MaterialCommunityIcons name="loading" size={20} color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
            )}
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: theme.card,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 24,
    margin: 20,
    marginTop: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  star: {
    marginHorizontal: 6,
    padding: 4,
    transform: [{ scale: 1 }],
  },
  ratingText: {
    fontSize: 14,
    color: theme.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  dropdown: {
    height: 56,
    backgroundColor: theme.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: theme.border,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dropdownItemText: {
    fontSize: 16,
    color: theme.text,
    marginLeft: 12,
  },
  dropdownPlaceholder: {
    color: theme.muted,
    fontSize: 16,
  },
  dropdownSelectedText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.background,
  },
  feedbackInputContainer: {
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 16,
    backgroundColor: theme.background,
    overflow: 'hidden',
  },
  feedbackInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.text,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  characterCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: `${theme.muted}10`,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  characterCount: {
    fontSize: 12,
    color: theme.muted,
    textAlign: 'right',
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  helpText: {
    fontSize: 12,
    color: theme.muted,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: theme.border,
  },
  submitButton: {
    flex: 2,
    backgroundColor: theme.primary,
    elevation: 3,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: theme.muted,
    opacity: 0.7,
  },
  cancelButtonText: {
    color: theme.muted,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});