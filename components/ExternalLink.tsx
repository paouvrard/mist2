import { Link } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { type ComponentProps } from 'react';
import { Platform } from 'react-native';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { 
  href: string;
  children?: React.ReactNode; 
};

export function ExternalLink({ href, children, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href as any} // Type assertion needed since expo-router has strict href types
      onPress={async (event) => {
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          await openBrowserAsync(href);
        }
      }}
    >
      {children}
    </Link>
  );
}
