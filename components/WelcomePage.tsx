import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { AppInfoSheet, AppDescription } from './AppInfoSheet';

interface WelcomePageProps {
  favoriteApps: Array<{ id: string; name: string; url: string; category: string; description?: string }>;
  onAppSelect: (appId: string) => void;
  onClearAppData: (appId: string) => void;
  onAddCustomApp?: () => void; // Add this prop for the add app functionality
  onDeleteApp?: (appId: string) => void; // Add this prop for the delete app functionality
  onShowCategoryInfo?: (category: string, descriptions: AppDescription[]) => void; // Add this prop to show category info
}

export function WelcomePage({ 
  favoriteApps, 
  onAppSelect, 
  onClearAppData, 
  onAddCustomApp,
  onDeleteApp,
  onShowCategoryInfo
}: WelcomePageProps) {
  const insets = useSafeAreaInsets();
  const windowWidth = Dimensions.get('window').width;
  const cardWidth = (windowWidth - 48) / 2; // Accounting for padding and gap between cards

  // State for the app info sheet
  const [isAppInfoSheetVisible, setIsAppInfoSheetVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [appDescriptions, setAppDescriptions] = useState<AppDescription[]>([]);
  
  // Calculate proper top padding based on platform, matching index page calculation exactly
  const titleTopPadding = Platform.OS === 'ios' 
    ? Math.max(insets.top, 10) // Use insets but ensure minimum of 10px on iOS
    : 16; // Reduced padding on Android to remove empty space

  // Get window dimensions for layout constraints
  const windowHeight = Dimensions.get('window').height;
  const maxMyAppsHeight = windowHeight * 0.25; // 25% of screen height maximum

  // Define category order (priority list)
  const categoryOrder = [
    'nft / social',
    'portfolio / send',
    'stake',
    'swap',
    'bridge',
    'earn / borrow', 
    'testnet',
    'smart wallet',
  ];

  // Group apps by category
  const appsByCategory = useMemo(() => {
    const groupedApps: { [key: string]: typeof favoriteApps } = {};
    
    // Initialize the 'my' category with an empty array
    groupedApps['my'] = [];
    
    favoriteApps.forEach(app => {
      const category = app.category || 'other';
      if (!groupedApps[category]) {
        groupedApps[category] = [];
      }
      groupedApps[category].push(app);
    });
    
    return groupedApps;
  }, [favoriteApps]);
  
  // Get sorted categories based on the predefined order
  const sortedCategories = useMemo(() => {
    // Get all unique categories from the apps
    const availableCategories = Object.keys(appsByCategory)
      .filter(category => category.toLowerCase() !== 'my'); // Exclude the "my" category
    
    // First, add categories in the predefined order (if they exist in the apps)
    const orderedCategories = categoryOrder.filter(cat => availableCategories.includes(cat));
    
    // Then add any additional categories that might not be in our predefined order
    const remainingCategories = availableCategories
      .filter(cat => !categoryOrder.includes(cat))
      .sort(); // Sort alphabetically
    
    return [...orderedCategories, ...remainingCategories];
  }, [appsByCategory, categoryOrder]);

  // Arrange categories into left and right columns
  const { leftColumn, rightColumn } = useMemo(() => {
    const left: string[] = [];
    const right: string[] = [];
    
    sortedCategories.forEach((category, index) => {
      if (index % 2 === 0) {
        left.push(category);
      } else {
        right.push(category);
      }
    });
    
    return { leftColumn: left, rightColumn: right };
  }, [sortedCategories]);

  // Handle info button click for a category
  const handleCategoryInfo = (category: string) => {
    // Get apps for this category
    const categoryApps = appsByCategory[category] || [];
    
    // Format app descriptions for the info sheet
    const descriptions: AppDescription[] = categoryApps.map(app => ({
      id: app.id,
      name: app.name,
      description: app.description || '', // Remove filler text, just use empty string instead
      url: app.url || '', // Add url to the description
      category: app.category || '' // Add category to the description
    }));
    
    if (onShowCategoryInfo) {
      // Use the provided handler if available
      onShowCategoryInfo(category, descriptions);
    } else {
      // Update state for internal handling
      setSelectedCategory(category);
      setAppDescriptions(descriptions);
      setIsAppInfoSheetVisible(true);
    }
  };

  // Render a category card for regular categories
  const renderCategoryCard = (category: string) => (
    <View key={category} style={[styles.categoryCard, { width: cardWidth }]}>
      <View style={styles.categoryTitleContainer}>
        <ThemedText style={styles.categoryTitle}>
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </ThemedText>
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => handleCategoryInfo(category)}>
          <Ionicons name="information-circle" size={20} color="#b8b8b8" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.appList}>
        {appsByCategory[category].map((app) => (
          <TouchableOpacity
            key={app.id}
            style={styles.appButton}
            onPress={() => onAppSelect(app.id)}>
            <ThemedText style={styles.appButtonText}>{app.name}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  
  // Render the My Apps section
  const renderMyAppsSection = () => {
    const myApps = appsByCategory['my'];
    const isEmpty = myApps.length === 0;
    
    return (
      <View style={styles.myAppsContainer}>
        <View style={[
          styles.myAppsTitleContainer,
          isEmpty && styles.centeredTitleContainer
        ]}>
          <View style={styles.titleAndButtonContainer}>
            <ThemedText style={styles.myAppsTitle}>MY APPS</ThemedText>
            
            {/* Add "+" button right next to the title */}
            {onAddCustomApp && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={onAddCustomApp}>
                <ThemedText style={styles.addButtonText}>+</ThemedText>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Info button stays on the right side */}
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => handleCategoryInfo('my')}>
            <Ionicons name="information-circle" size={20} color="#b8b8b8" />
          </TouchableOpacity>
        </View>
        
        {!isEmpty ? (
          <ScrollView 
            style={[styles.myAppsScrollView, { maxHeight: maxMyAppsHeight }]}
            contentContainerStyle={styles.myAppsScrollContent}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}>
            
            <View style={styles.myAppsRowContainer}>
              {myApps.map((app) => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.myAppButton}
                  onPress={() => onAppSelect(app.id)}>
                  <ThemedText style={styles.appButtonText}>{app.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            
          </ScrollView>
        ) : (
          <View style={styles.emptyMyAppsContainer}>
            <ThemedText style={styles.noMyAppsText}>
              No apps added yet
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.titleContainer, { marginTop: titleTopPadding }]}>
        <ThemedText style={styles.titleText}>APPS</ThemedText>
      </View>
      
      <View style={styles.mainContainer}>
        {/* Two column scrollable area for regular categories with mist effect */}
        <View style={styles.mistContainer}>
          {/* Bottom mist gradient only */}
          <LinearGradient
            colors={['rgba(42, 42, 42, 0)', 'rgba(42, 42, 42, 1)']}
            style={styles.mistOverlayBottom}
          />
          
          <ScrollView 
            style={styles.columnsScrollContainer}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}>
            <View style={styles.columnsContainer}>
              {/* Left Column */}
              <View style={styles.column}>
                {leftColumn.map(renderCategoryCard)}
              </View>
              
              {/* Right Column */}
              <View style={styles.column}>
                {rightColumn.map(renderCategoryCard)}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* MY APPS Section - Fixed below columns, not inside the ScrollView */}
        <View style={styles.myAppsSection}>
          {renderMyAppsSection()}
        </View>
      </View>

      {/* App Info Sheet */}
      <AppInfoSheet
        isVisible={isAppInfoSheetVisible}
        onClose={() => setIsAppInfoSheetVisible(false)}
        categoryTitle={selectedCategory}
        appDescriptions={appDescriptions}
        onClearData={onClearAppData}
        onDeleteApp={selectedCategory.toLowerCase() === 'my' ? onDeleteApp : undefined}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2a2a', // Same dark background as index page
    padding: 16,
    marginBottom: 45,
  },
  titleContainer: {
    paddingLeft: 0,
    paddingRight: 32,
    paddingBottom: 16,
  },
  titleText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'SpaceMono-Regular',
    letterSpacing: 0.5,
    height: 40,
    lineHeight: 36,
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  contentContainer: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  // Mist effect container
  mistContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: 6,
    overflow: 'hidden',
  },
  columnsScrollContainer: {
    flex: 1,
  },
  // Mist gradient overlays
  mistOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    zIndex: 2,
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 2, // Add a little padding to keep content away from mist edges
  },
  column: {
    flexBasis: '48%', // Not quite 50% to allow for spacing
  },
  categoryCard: {
    backgroundColor: '#3a3a3a',
    borderRadius: 0,
    padding: 12,
    marginBottom: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    color: '#e8e8e8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  infoButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  appList: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  appButton: {
    backgroundColor: '#555555',
    padding: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
    width: '100%', // Fill width of parent
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  appButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonContainer: {
    width: '100%',
    alignItems: 'flex-start', // Align to the left
    marginTop: 8,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#555555',
    height: 32, 
    width: 32, 
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
    marginLeft: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  myAppsSection: {
    width: '100%',
    marginTop: 16,
    marginBottom: 16,
  },
  myAppsContainer: {
    backgroundColor: '#3a3a3a',
    borderRadius: 0,
    padding: 12,
    marginBottom: 6,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  myAppsTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  myAppsTitle: {
    fontSize: 16,
    color: '#e8e8e8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  centeredTitleContainer: {
    marginBottom: 0, // Remove bottom margin when empty
  },
  titleAndButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  myAppsScrollView: {
    width: '100%',
  },
  myAppsScrollContent: {
    width: '100%',
  },
  myAppsRowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
  },
  myAppButton: {
    backgroundColor: '#555555',
    padding: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
    marginRight: 8,
    alignSelf: 'flex-start',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  emptyMyAppsContainer: {
    paddingVertical: 0, // Remove vertical padding to minimize container height
    height: 0, // Set height to 0 to minimize vertical space
    overflow: 'hidden', // Hide any overflow content
  },
  noMyAppsText: {
    color: '#b8b8b8',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
  },
});