import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { useAuth } from '@/lib/auth';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { profile } = useAuth();
  const isLeader = profile?.role === 'general' || profile?.role === 'captain';
  const hasLeadershipRole = !!profile?.leadership_role;
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff', // White for active tab
        tabBarInactiveTintColor: '#8b98a5', // Muted gray for inactive
        tabBarStyle: {
          backgroundColor: '#0f1419', // Dark blue-black background
          borderTopColor: '#2a3744', // Subtle dark border
          borderTopWidth: 1,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Missions',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-ul" color={color} />,
        }}
      />
      <Tabs.Screen
        name="command-center"
        options={{
          title: 'War Room',
          tabBarIcon: ({ color }) => <TabBarIcon name="line-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ballot"
        options={{
          title: 'Ballot',
          tabBarIcon: ({ color }) => <TabBarIcon name="check-square-o" color={color} />,
        }}
      />
      {hasLeadershipRole && (
        <Tabs.Screen
          name="admin-endorsements"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color }) => <TabBarIcon name="shield" color={color} />,
          }}
        />
      )}
      <Tabs.Screen
        name="invite"
        options={{
          title: 'Invite',
          tabBarIcon: ({ color }) => <TabBarIcon name="user-plus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Squad',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
