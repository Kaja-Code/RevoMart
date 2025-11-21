import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import axios from "axios";
import { API_URL } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

const SellerProfileScreen = ({ ownerId, reviewerId, onClose }) => {
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState({});
  const [loading, setLoading] = useState(true);

  // User review input
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { user, userDetails, signOut } = useAuth();

  useEffect(() => {
    if (!ownerId) return;

    const fetchSellerProfile = async () => {
      try {
        setLoading(true);

        // Fetch seller profile (replace with your API endpoint)
        const profileRes = await axios.get(`${API_URL}/api/auth/sellers/${ownerId}`);
        setSeller(profileRes.data);

        // Fetch seller reviews
        const reviewsRes = await axios.get(`${API_URL}/api/reviews/seller/${ownerId}`);
        const reviewList = reviewsRes.data.reviews || [];
        setReviews(reviewList);

        calculateRatingStats(reviewList);
      } catch (err) {
        console.error("Error fetching seller profile:", err);
        Alert.alert("Error", "Failed to load seller profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchSellerProfile();
  }, [ownerId]);

  const calculateRatingStats = (reviewList) => {
    if (reviewList.length === 0) {
      setAvgRating(0);
      setRatingDistribution({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
      return;
    }

    const total = reviewList.reduce((sum, r) => sum + r.rating, 0);
    setAvgRating((total / reviewList.length).toFixed(1));

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewList.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });
    setRatingDistribution(distribution);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "#22C55E";
    if (rating >= 4) return "#84CC16";
    if (rating >= 3) return "#EAB308";
    if (rating >= 2) return "#F97316";
    return "#EF4444";
  };

  const renderStars = (rating, size = 16, onPress = null) => (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} disabled={!onPress} onPress={() => onPress && onPress(star)}>
          <Ionicons name={star <= rating ? "star" : "star-outline"} size={size} color="#FFD700" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRatingBar = (stars, count, total) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <View style={styles.ratingBarContainer} key={stars}>
        <Text style={styles.ratingBarText}>{stars} ★</Text>
        <View style={styles.ratingBar}>
          <View
            style={[styles.ratingBarFill, { width: `${percentage}%`, backgroundColor: getRatingColor(stars) }]}
          />
        </View>
        <Text style={styles.ratingBarCount}>({count})</Text>
      </View>
    );
  };

  const submitReview = async () => {
    if (!userRating) return Alert.alert("Rating Required", "Please select a rating.");
   

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/reviews/seller/${ownerId}`, {
        reviewerId :user.uid,
        rating: userRating,
        comment: userComment,
      });

      const newReview = res.data.review;
      const updatedReviews = [newReview, ...reviews];
      setReviews(updatedReviews);
      calculateRatingStats(updatedReviews);

      setUserRating(0);
      setUserComment("");
      Alert.alert("Success", "Your review has been submitted.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerAvatar}>
          <Text style={styles.reviewerAvatarText}>{item.reviewerName?.charAt(0)?.toUpperCase() || "U"}</Text>
        </View>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{item.reviewerName || "Anonymous User"}</Text>
          <View style={styles.reviewMeta}>
            {renderStars(item.rating)}
            <Text style={styles.reviewDate}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recently"}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.reviewComment}>{item.comment || "No comment provided."}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading Seller Profile...</Text>
        </View>
      </View>
    );
  }

  if (!seller) {
    return (
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>No seller data found.</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.popup}>
        <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{seller.username?.charAt(0)?.toUpperCase() || "S"}</Text>
              </View>
              {seller.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                </View>
              )}
            </View>

            <Text style={styles.sellerName}>{seller.username || "Seller"}</Text>

            <View style={styles.sellerRatingRow}>
              {renderStars(Math.round(avgRating), 18)}
              <Text style={styles.sellerRatingText}>
                {avgRating} / 5 ({reviews.length} reviews)
              </Text>
            </View>
            <Text style={styles.sellerSubtitle}>Trusted Seller</Text>

            {/* Rating Overview */}
            <View style={styles.ratingOverview}>
              <View style={styles.avgRatingContainer}>
                <Text style={styles.avgRating}>{avgRating}</Text>
                <Text style={styles.avgRatingText}>out of 5</Text>
                {renderStars(Math.round(avgRating), 20)}
              </View>
              <View style={styles.ratingStats}>
                <Text style={styles.totalReviews}>{reviews.length} reviews</Text>
                <View style={styles.ratingBars}>
                  {[5, 4, 3, 2, 1].map((stars) =>
                    renderRatingBar(stars, ratingDistribution[stars] || 0, reviews.length)
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Seller Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Seller Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={18} color="#666" />
                <Text style={styles.infoText}>{seller.email || "Not provided"}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={18} color="#666" />
                <Text style={styles.infoText}>{seller.phoneNumber || "Not provided"}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={18} color="#666" />
                <Text style={styles.infoText}>{seller.address || "Not provided"}</Text>
              </View>
            </View>
          </View>

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Customer Reviews ({reviews.length})</Text>
            {reviews.length > 0 ? (
              <FlatList
                data={reviews}
                keyExtractor={(item) => item._id}
                renderItem={renderReview}
                scrollEnabled={false}
                style={styles.reviewsList}
              />
            ) : (
              <View style={styles.noReviewsContainer}>
                <Ionicons name="star-outline" size={48} color="#CCC" />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>
                  This seller doesn't have any reviews yet.
                </Text>
              </View>
            )}
          </View>

          {/* Add Review Section */}
          <View style={styles.addReviewSection}>
            <Text style={styles.sectionTitle}>Rate this Seller</Text>
            <Text style={{ marginBottom: 6 }}>Your Rating:</Text>
            {renderStars(userRating, 32, setUserRating)}
            <TextInput
              style={styles.commentInput}
              placeholder="Write your review..."
              value={userComment}
              onChangeText={setUserComment}
              multiline
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitReview}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? "Submitting..." : "Submit Review"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Close Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  popup: { backgroundColor: "#fff", borderRadius: 20, padding: 20, width: "90%", maxHeight: "85%", elevation: 10 },
  closeIcon: { position: "absolute", top: 15, right: 15, zIndex: 1 },
  scrollView: { width: "100%" },
  profileHeader: { alignItems: "center", paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: "#F0F0F0", marginBottom: 20 },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFF", fontSize: 32, fontWeight: "bold" },
  verifiedBadge: { position: "absolute", bottom: 0, right: 0 },
  sellerName: { fontSize: 24, fontWeight: "bold", color: "#1F2937" },
  sellerRatingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  sellerRatingText: { fontSize: 14, color: "#6B7280" },
  sellerSubtitle: { fontSize: 16, color: "#6B7280", marginVertical: 12 },
  ratingOverview: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 10 },
  avgRatingContainer: { alignItems: "center" },
  avgRating: { fontSize: 36, fontWeight: "bold", color: "#1F2937" },
  avgRatingText: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
  ratingStats: { flex: 1, marginLeft: 20 },
  totalReviews: { fontSize: 14, color: "#6B7280", marginBottom: 10 },
  ratingBars: { gap: 4 },
  ratingBarContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingBarText: { fontSize: 12, color: "#6B7280", width: 20 },
  ratingBar: { flex: 1, height: 6, backgroundColor: "#E5E7EB", borderRadius: 3 },
  ratingBarFill: { height: "100%", borderRadius: 3 },
  ratingBarCount: { fontSize: 12, color: "#6B7280", width: 30 },
  infoSection: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginBottom: 15 },
  infoGrid: { gap: 12 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoText: { fontSize: 14, color: "#4B5563", flex: 1 },
  reviewsSection: { marginBottom: 20 },
  reviewCard: { backgroundColor: "#F8FAFC", padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#007AFF" },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  reviewerAvatarText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontWeight: "bold", color: "#1F2937", fontSize: 14 },
  reviewMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewDate: { fontSize: 12, color: "#6B7280" },
  reviewComment: { fontSize: 14, color: "#4B5563", lineHeight: 20 },
  noReviewsContainer: { alignItems: "center", paddingVertical: 40 },
  noReviewsText: { fontSize: 16, color: "#6B7280", marginTop: 12 },
  noReviewsSubtext: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  loadingText: { marginTop: 12, color: "#6B7280" },
  errorText: { marginTop: 12, color: "#EF4444", fontSize: 16 },
  closeButton: { backgroundColor: "#007AFF", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 10 },
  closeText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  addReviewSection: { marginTop: 20, marginBottom: 30 },
  commentInput: { borderWidth: 1, borderColor: "#CCC", borderRadius: 8, padding: 10, marginTop: 10, minHeight: 80, textAlignVertical: "top" },
  submitButton: { backgroundColor: "#007AFF", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 12 },
  submitButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});

export default SellerProfileScreen;
