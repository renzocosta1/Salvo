import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_layout.tsx:6',message:'Tab layout module loaded',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
// #endregion

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_layout.tsx:21',message:'TabLayout mounted',data:{routesRegistered:['index','map','two']},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
  }, []);
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00ff88', // Hard Party Green
        tabBarInactiveTintColor: '#a0a0a0',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 1,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Command',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-ul" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
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
