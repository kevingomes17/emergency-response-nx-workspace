import React from 'react';
import { Text, Platform, StyleSheet } from 'react-native';

interface MaterialIconProps {
  name: string;
  size?: number;
  color?: string;
}

/**
 * Renders a Material Icons Outlined icon on web using the Google Fonts stylesheet.
 * On native, falls back to a text placeholder (native would need react-native-vector-icons).
 */
export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  size = 24,
  color = '#888',
}) => {
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          styles.icon,
          { fontSize: size, color },
        ]}
      >
        {name}
      </Text>
    );
  }

  // Native fallback: emoji mapping for common icons
  const fallback: Record<string, string> = {
    assignment: '\u{1F4CB}',
    notifications: '\u{1F514}',
    person: '\u{1F464}',
    campaign: '\u{1F4E2}',
    report: '\u{1F6D1}',
    list_alt: '\u{1F4CB}',
  };

  return (
    <Text style={{ fontSize: size, color }}>
      {fallback[name] ?? name}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    fontFamily: 'Material Icons Outlined',
    fontWeight: 'normal',
    fontStyle: 'normal',
    letterSpacing: 0,
    textTransform: 'none',
  },
});
