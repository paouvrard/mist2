import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';
import { EdgeInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
  contentInsets?: EdgeInsets;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  contentInsets,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const bottom = useBottomTabOverflow();
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    };
  });

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: bottom },
          contentInsets && {
            paddingTop: contentInsets.top + HEADER_HEIGHT,
            paddingLeft: contentInsets.left,
            paddingRight: contentInsets.right,
          }
        ]}>
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] },
            headerAnimatedStyle,
            contentInsets && { top: contentInsets.top },
          ]}>
          {headerImage}
        </Animated.View>
        <ThemedView style={styles.content}>{children}</ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});
