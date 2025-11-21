import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated,
  ScrollView,
  Dimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

const { width } = Dimensions.get('window');

export default function AdminFeedbackScreen({ navigation }) {
  const { user } = useAuth();
  
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('new');

  const fadeAnim = useState(new Animated.Value(0))[0];

  // Stats
  const [stats, setStats] = useState({
    totalFeedback: 0,
    avgRating: 0,
    byType: { bug: 0, suggestion: 0, general: 0 },
    byStatus: { new: 0, reviewed: 0, implemented: 0, rejected: 0 }
  });

  const fetchFeedback = async (pageNum = 1, filterType = 'all', reset = false) => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      let url = `${API_URL}/api/admin/feedback?page=${pageNum}&limit=20`;
      if (filterType !== 'all') url += `&type=${filterType}`;
      if (search) url += `&search=${search}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        if (reset || pageNum === 1) {
          setFeedback(data.feedback);
        } else {
          setFeedback(prev => [...prev, ...data.feedback]);
        }
        setHasMore(data.pagination?.page < data.pagination?.totalPages);
        setPage(pageNum);
        calculateStats(data.feedback);
        
        // Animate content in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      Alert.alert('Error', 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (feedbackData) => {
    const total = feedbackData.length;
    const avgRating = total > 0 
      ? feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / total 
      : 0;

    const byType = feedbackData.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, { bug: 0, suggestion: 0, general: 0 });

    const byStatus = feedbackData.reduce((acc, f) => {
      const status = f.status || 'new';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, { new: 0, reviewed: 0, implemented: 0, rejected: 0 });

    setStats({
      totalFeedback: total,
      avgRating: avgRating.toFixed(1),
      byType,
      byStatus
    });
  };

  const updateFeedbackStatus = async (feedbackId, newStatus, notes) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/admin/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          adminNotes: notes,
          reviewedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        setFeedback(prev => prev.map(f => 
          f._id === feedbackId 
            ? { ...f, status: newStatus, adminNotes: notes, reviewedAt: new Date().toISOString() }
            : f
        ));
        Alert.alert('Success', 'Feedback status updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update feedback');
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      Alert.alert('Error', 'Failed to update feedback');
    }
  };

  const deleteFeedback = async (feedbackId) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await user.getIdToken();
              const response = await fetch(`${API_URL}/api/admin/feedback/${feedbackId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                setFeedback(prev => prev.filter(f => f._id !== feedbackId));
                Alert.alert('Success', 'Feedback deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete feedback');
              }
            } catch (error) {
              console.error('Error deleting feedback:', error);
              Alert.alert('Error', 'Failed to delete feedback');
            }
          }
        }
      ]
    );
  };

  const openFeedbackModal = (item) => {
    setSelectedFeedback(item);
    setAdminNotes(item.adminNotes || '');
    setFeedbackStatus(item.status || 'new');
    setModalVisible(true);
  };

  const handleUpdateFeedback = () => {
    if (selectedFeedback) {
      updateFeedbackStatus(selectedFeedback._id, feedbackStatus, adminNotes);
      setModalVisible(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeedback(1, filter, true).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    fetchFeedback(1, filter, true);
  }, [filter]);

  const handleSearch = () => {
    fetchFeedback(1, filter, true);
  };

  const getTypeIcon = (type) => {
    const icons = {
      bug: 'bug',
      suggestion: 'lightbulb-on',
      general: 'comment-text'
    };
    return icons[type] || 'comment-text';
  };

  const getTypeColor = (type) => {
    const colors = {
      bug: '#f44336',
      suggestion: '#2196F3',
      general: '#4CAF50'
    };
    return colors[type] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = {
      new: '#FF9800',
      reviewed: '#2196F3',
      implemented: '#4CAF50',
      rejected: '#666'
    };
    return colors[status] || '#999';
  };

  const renderStarRating = (rating) => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color="#FFD700"
          />
        ))}
      </View>
    );
  };

  const renderFeedbackItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.feedbackItem,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}
    >
      <View style={styles.feedbackHeader}>
        <View style={styles.feedbackInfo}>
          <View style={[styles.typeIconContainer, { backgroundColor: getTypeColor(item.type) + '20' }]}>
            <MaterialCommunityIcons 
              name={getTypeIcon(item.type)} 
              size={20} 
              color={getTypeColor(item.type)} 
            />
          </View>
          <View style={styles.feedbackTitleContainer}>
            <View style={styles.feedbackTypeRow}>
              <Text style={styles.feedbackType}>{item.type.toUpperCase()}</Text>
              {item.rating > 0 && renderStarRating(item.rating)}
            </View>
            <Text style={styles.feedbackUser}>
              From: {item.userId?.username || item.email || 'Anonymous'}
            </Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status || 'new') + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status || 'new') }]}>
            {item.status || 'new'}
          </Text>
        </View>
      </View>

      <Text style={styles.feedbackMessage} numberOfLines={3}>
        {item.message}
      </Text>

      <View style={styles.feedbackMeta}>
        <View style={styles.metaLeft}>
          <Text style={styles.feedbackDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          {item.reviewedAt && (
            <View style={styles.reviewedIndicator}>
              <MaterialCommunityIcons name="clock-check" size={12} color="#4CAF50" />
              <Text style={styles.reviewedText}>
                Reviewed: {new Date(item.reviewedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.metaRight}>
          {item.adminNotes && (
            <View style={styles.noteIndicator}>
              <MaterialCommunityIcons name="note-text" size={14} color="#2196F3" />
            </View>
          )}
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => deleteFeedback(item._id)}
          >
            <MaterialCommunityIcons name="delete-outline" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderStats = () => (
    <Animated.View 
      style={[
        styles.statsSection,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0]
            })
          }]
        }
      ]}
    >
      <View style={styles.statsHeader}>
        <Text style={styles.statsTitle}>Feedback Overview</Text>
        <MaterialCommunityIcons name="chart-box" size={24} color="#2F6F61" />
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(47, 111, 97, 0.1)' }]}>
            <MaterialCommunityIcons name="comment-multiple" size={24} color="#2F6F61" />
          </View>
          <Text style={styles.statValue}>{stats.totalFeedback}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
            <MaterialCommunityIcons name="star" size={24} color="#FFD700" />
          </View>
          <Text style={styles.statValue}>{stats.avgRating}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
            <MaterialCommunityIcons name="bug" size={24} color="#f44336" />
          </View>
          <Text style={styles.statValue}>{stats.byType.bug}</Text>
          <Text style={styles.statLabel}>Bugs</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#2196F3" />
          </View>
          <Text style={styles.statValue}>{stats.byType.suggestion}</Text>
          <Text style={styles.statLabel}>Ideas</Text>
        </View>
      </View>

      <View style={styles.statusBreakdown}>
        <Text style={styles.breakdownTitle}>Status Breakdown</Text>
        <View style={styles.statusBars}>
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <View key={status} style={styles.statusBar}>
              <View style={styles.statusBarInfo}>
                <View style={styles.statusLabel}>
                  <View 
                    style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} 
                  />
                  <Text style={styles.statusBarLabel}>{status}</Text>
                </View>
                <Text style={styles.statusBarCount}>{count}</Text>
              </View>
              <View style={styles.statusBarTrack}>
                <View 
                  style={[
                    styles.statusBarFill, 
                    { 
                      width: `${stats.totalFeedback > 0 ? (count / stats.totalFeedback) * 100 : 0}%`,
                      backgroundColor: getStatusColor(status)
                    }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header with glass effect */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2F6F61" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Feedback Management</Text>
            <Text style={styles.headerSubtitle}>{stats.totalFeedback} feedback items</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="filter-variant" size={24} color="#2F6F61" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#2F6F61" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search feedback..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {[
            { key: 'all', label: 'All Feedback', icon: 'comment-multiple' },
            { key: 'bug', label: 'Bugs', icon: 'bug' },
            { key: 'suggestion', label: 'Suggestions', icon: 'lightbulb-on' },
            { key: 'general', label: 'General', icon: 'comment-text' },
          ].map((filterItem) => (
            <TouchableOpacity
              key={filterItem.key}
              style={[
                styles.filterButton,
                filter === filterItem.key && styles.activeFilter
              ]}
              onPress={() => setFilter(filterItem.key)}
            >
              <MaterialCommunityIcons 
                name={filterItem.icon} 
                size={16} 
                color={filter === filterItem.key ? "#FFF" : "#2F6F61"} 
              />
              <Text style={[
                styles.filterText,
                filter === filterItem.key && styles.activeFilterText
              ]}>
                {filterItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={feedback}
        keyExtractor={(item) => item._id}
        renderItem={renderFeedbackItem}
        ListHeaderComponent={renderStats}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2F6F61']}
            tintColor="#2F6F61"
          />
        }
        onEndReached={() => {
          if (!loading && hasMore) {
            fetchFeedback(page + 1, filter);
          }
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="comment-off" size={80} color="#E1EDE7" />
            <Text style={styles.emptyTitle}>No feedback found</Text>
            <Text style={styles.emptySubtitle}>
              {search || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No feedback submitted yet'
              }
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Feedback Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="comment-text" size={24} color="#2F6F61" />
              <Text style={styles.modalTitle}>Feedback Details</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedFeedback && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <View style={[styles.typeBadge, { backgroundColor: getTypeColor(selectedFeedback.type) + '20' }]}>
                      <MaterialCommunityIcons 
                        name={getTypeIcon(selectedFeedback.type)} 
                        size={14} 
                        color={getTypeColor(selectedFeedback.type)} 
                      />
                      <Text style={[styles.typeBadgeText, { color: getTypeColor(selectedFeedback.type) }]}>
                        {selectedFeedback.type}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Submitted By</Text>
                    <Text style={styles.detailValue}>
                      {selectedFeedback.userId?.username || selectedFeedback.email || 'Anonymous User'}
                    </Text>
                  </View>

                  {selectedFeedback.rating > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rating</Text>
                      {renderStarRating(selectedFeedback.rating)}
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Submitted On</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedFeedback.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Feedback Message</Text>
                  <View style={styles.messageContainer}>
                    <Text style={styles.detailMessage}>{selectedFeedback.message}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Update Status</Text>
                  <View style={styles.statusSelector}>
                    {['new', 'reviewed', 'implemented', 'rejected'].map(status => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusOption,
                          feedbackStatus === status && { backgroundColor: getStatusColor(status) }
                        ]}
                        onPress={() => setFeedbackStatus(status)}
                      >
                        <Text style={[
                          styles.statusOptionText,
                          feedbackStatus === status && styles.statusOptionTextActive
                        ]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Admin Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add your notes or response about this feedback..."
                    placeholderTextColor="#999"
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleUpdateFeedback}
              >
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && feedback.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2F6F61" />
          <Text style={styles.loadingText}>Loading feedback...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 10,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerText: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2F6F61',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  backButton: {
    padding: 8,
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 237, 231, 0.5)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2F2F2F',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 237, 231, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  activeFilter: {
    backgroundColor: '#2F6F61',
    borderColor: '#2F6F61',
  },
  filterText: {
    fontSize: 14,
    color: '#2F6F61',
    fontWeight: '500',
    marginLeft: 6,
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  statsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2F6F61',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2F2F2F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusBreakdown: {
    marginTop: 8,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F6F61',
    marginBottom: 16,
  },
  statusBars: {
    gap: 12,
  },
  statusBar: {
    marginBottom: 8,
  },
  statusBarInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBarLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  statusBarCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F2F2F',
  },
  statusBarTrack: {
    height: 6,
    backgroundColor: 'rgba(224, 224, 224, 0.5)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  feedbackItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginVertical: 6,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedbackInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedbackTitleContainer: {
    flex: 1,
  },
  feedbackTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feedbackType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  feedbackUser: {
    fontSize: 14,
    color: '#2F2F2F',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flex: 1,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  reviewedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewedText: {
    fontSize: 11,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteIndicator: {
    padding: 4,
  },
  moreButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2F6F61',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.9)',
  },
  loadingText: {
    fontSize: 16,
    color: '#2F6F61',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(47, 111, 97, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2F2F2F',
    flex: 1,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F2F2F',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messageContainer: {
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  detailMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statusSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
  },
  statusOptionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.3)',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#2F2F2F',
    minHeight: 120,
    backgroundColor: '#f8f9fa',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(47, 111, 97, 0.1)',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#2F6F61',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});