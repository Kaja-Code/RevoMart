import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  ScrollView,
  Dimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

const { width } = Dimensions.get('window');

export default function AdminComplaintsScreen({ navigation }) {
  const { user } = useAuth();
  
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_review: 0,
    resolved: 0
  });

  const fadeAnim = useState(new Animated.Value(0))[0];

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      let url = `${API_URL}/api/admin/complaints?limit=50`;
      if (filter !== 'all') url += `&status=${filter}`;
      if (search) url += `&search=${search}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setComplaints(data.complaints);
        calculateStats(data.complaints);
        
        // Animate content in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      Alert.alert('Error', 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (complaintsList) => {
    const stats = {
      total: complaintsList.length,
      open: complaintsList.filter(c => c.status === 'open').length,
      in_review: complaintsList.filter(c => c.status === 'in_review').length,
      resolved: complaintsList.filter(c => c.status === 'resolved').length
    };
    setStats(stats);
  };

  const updateComplaintStatus = async (complaintId, status, notes = '') => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/admin/complaints/${complaintId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, resolutionNotes: notes })
      });

      if (response.ok) {
        setComplaints(prev => prev.map(complaint => 
          complaint._id === complaintId 
            ? { ...complaint, status, resolutionNotes: notes, resolvedAt: status === 'resolved' ? new Date().toISOString() : complaint.resolvedAt }
            : complaint
        ));
        Alert.alert('Success', `Complaint ${status === 'resolved' ? 'resolved' : 'updated'} successfully`);
      } else {
        Alert.alert('Error', 'Failed to update complaint');
      }
    } catch (error) {
      console.error('Error updating complaint:', error);
      Alert.alert('Error', 'Failed to update complaint');
    }
  };

  const openResolutionModal = (complaint) => {
    setSelectedComplaint(complaint);
    setResolutionNotes(complaint.resolutionNotes || '');
    setModalVisible(true);
  };

  const handleResolve = () => {
    if (selectedComplaint && resolutionNotes.trim()) {
      updateComplaintStatus(selectedComplaint._id, 'resolved', resolutionNotes);
      setModalVisible(false);
      setResolutionNotes('');
    } else {
      Alert.alert('Error', 'Please enter resolution notes');
    }
  };

  const deleteComplaint = async (complaintId) => {
    Alert.alert(
      'Delete Complaint',
      'Are you sure you want to delete this complaint? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await user.getIdToken();
              const response = await fetch(`${API_URL}/api/admin/complaints/${complaintId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                setComplaints(prev => prev.filter(c => c._id !== complaintId));
                Alert.alert('Success', 'Complaint deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete complaint');
              }
            } catch (error) {
              console.error('Error deleting complaint:', error);
              Alert.alert('Error', 'Failed to delete complaint');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints().finally(() => setRefreshing(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const handleSearch = () => {
    fetchComplaints();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#FF9800';
      case 'in_review': return '#2196F3';
      case 'resolved': return '#4CAF50';
      case 'closed': return '#666';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return 'alert-circle';
      case 'in_review': return 'clock-alert';
      case 'resolved': return 'check-circle';
      case 'closed': return 'archive';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderComplaintItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.complaintItem,
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
      <View style={styles.complaintHeader}>
        <View style={styles.complaintInfo}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons 
              name={getStatusIcon(item.status)} 
              size={20} 
              color={getStatusColor(item.status)} 
            />
            <Text style={styles.complaintTitle} numberOfLines={2}>{item.title}</Text>
          </View>
          <Text style={styles.complaintUser}>
            By: {item.complainantId?.username || 'Unknown User'}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.complaintDescription} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.complaintMeta}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="calendar" size={12} color="#666" />
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          </View>
          
          {item.resolvedAt && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="check-circle" size={12} color="#4CAF50" />
              <Text style={styles.metaText}>Resolved: {formatDate(item.resolvedAt)}</Text>
            </View>
          )}
        </View>

        {item.productId && (
          <View style={styles.productInfo}>
            <MaterialCommunityIcons name="package-variant" size={12} color="#2F6F61" />
            <Text style={styles.productText} numberOfLines={1}>
              Product: {item.productId.title}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.complaintActions}>
        <View style={styles.actionButtons}>
          {item.status === 'open' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}
              onPress={() => updateComplaintStatus(item._id, 'in_review')}
            >
              <MaterialCommunityIcons name="clock-start" size={16} color="#2196F3" />
              <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>Review</Text>
            </TouchableOpacity>
          )}
          
          {(item.status === 'open' || item.status === 'in_review') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.resolveButton]}
              onPress={() => openResolutionModal(item)}
            >
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Resolve</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => deleteComplaint(item._id)}
        >
          <MaterialCommunityIcons name="delete-outline" size={18} color="#F44336" />
        </TouchableOpacity>
      </View>

      {item.resolutionNotes && (
        <View style={styles.resolutionNotes}>
          <Text style={styles.notesLabel}>Resolution Notes:</Text>
          <Text style={styles.notesText}>{item.resolutionNotes}</Text>
        </View>
      )}
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
            <Text style={styles.headerTitle}>Complaint Management</Text>
            <Text style={styles.headerSubtitle}>{stats.total} complaints • {stats.open} need attention</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="filter-variant" size={24} color="#2F6F61" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Stats */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#2F6F61" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search complaints..."
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
        
        {/* Quick Stats */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
        >
          <View style={[styles.statCard, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.in_review}</Text>
            <Text style={styles.statLabel}>In Review</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(47, 111, 97, 0.1)' }]}>
            <Text style={[styles.statNumber, { color: '#2F6F61' }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </ScrollView>

        {/* Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {[
            { key: 'all', label: 'All Complaints', icon: 'alert-circle-outline' },
            { key: 'open', label: 'Open', icon: 'alert-circle' },
            { key: 'in_review', label: 'In Review', icon: 'clock-alert' },
            { key: 'resolved', label: 'Resolved', icon: 'check-circle' },
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
        data={complaints}
        keyExtractor={(item) => item._id}
        renderItem={renderComplaintItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2F6F61']}
            tintColor="#2F6F61"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={80} color="#E1EDE7" />
            <Text style={styles.emptyTitle}>No complaints found</Text>
            <Text style={styles.emptySubtitle}>
              {search || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No complaints reported yet'
              }
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Resolution Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
              <Text style={styles.modalTitle}>Resolve Complaint</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedComplaint && (
              <View style={styles.complaintPreview}>
                <Text style={styles.previewTitle}>{selectedComplaint.title}</Text>
                <Text style={styles.previewDescription} numberOfLines={3}>
                  {selectedComplaint.description}
                </Text>
              </View>
            )}

            <Text style={styles.modalLabel}>Resolution Notes</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe how this complaint was resolved..."
              placeholderTextColor="#999"
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalResolveButton, !resolutionNotes.trim() && styles.disabledButton]}
                onPress={handleResolve}
                disabled={!resolutionNotes.trim()}
              >
                <Text style={styles.modalResolveText}>Mark as Resolved</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && complaints.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2F6F61" />
          <Text style={styles.loadingText}>Loading complaints...</Text>
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
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
  complaintItem: {
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
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  complaintInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F2F2F',
    flex: 1,
    marginLeft: 8,
  },
  complaintUser: {
    fontSize: 12,
    color: '#666',
    marginLeft: 28,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  complaintDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  complaintMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productText: {
    fontSize: 12,
    color: '#2F6F61',
    fontStyle: 'italic',
    marginLeft: 4,
    flex: 1,
  },
  complaintActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  resolveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  moreButton: {
    padding: 8,
  },
  resolutionNotes: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(225, 237, 231, 0.5)',
    borderRadius: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F6F61',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
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
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  complaintPreview: {
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F2F2F',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F2F2F',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.3)',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#2F2F2F',
    minHeight: 120,
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalResolveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  modalResolveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});