import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { store } from './src/store';
import { initializeDatabase } from './src/database';
import { LoadingSpinner } from './src/components/LoadingSpinner';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { Task } from './src/types/Task';
import { COLORS } from './src/utils/constants';
import { APIService } from './src/services/apiService'; // Added this import

export type RootStackParamList = {
  TaskList: undefined;
  TaskDetail: { task: Task };
};

const Stack = createStackNavigator<RootStackParamList>();

function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  useNetworkStatus();
  return <>{children}</>;
}
const TaskListScreen = React.lazy(() =>
  import('./src/screens/TaskListScreen').then(module => ({ default: module.TaskListScreen }))
);
const TaskDetailScreen = React.lazy(() =>
  import('./src/screens/TaskDetailScreen').then(module => ({ default: module.TaskDetailScreen }))
);

function TaskListScreenWrapper({ navigation }: any) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  const handleBackToList = () => {
    setSelectedTask(null);
  };

  if (selectedTask) {
    return (
      <React.Suspense fallback={<LoadingSpinner message="Loading..." />}>
        <TaskDetailScreen
          task={selectedTask}
          onBack={handleBackToList}
        />
      </React.Suspense>
    );
  }

  return (
    <React.Suspense fallback={<LoadingSpinner message="Loading..." />}>
      <TaskListScreen onTaskSelect={handleTaskSelect} />
    </React.Suspense>
  );
}

// Main App Navigator - Simplified to use only TaskList with conditional rendering
function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id="RootStack"
        initialRouteName="TaskList"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen
          name="TaskList"
          component={TaskListScreenWrapper}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// App with Database Initialization
function AppWithDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase()
      .then(() => {
        APIService.initializeMockData();
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error('Failed to initialize app:', error);
        setInitError(error.message);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize the app. Please restart the application.',
          [
            {
              text: 'Retry',
              onPress: () => {
                setInitError(null);
                setIsInitialized(false);
                initializeDatabase()
                  .then(() => {
                    APIService.initializeMockData();
                    setIsInitialized(true);
                  })
                  .catch((err) => setInitError(err.message));
              },
            },
          ]
        );
      });
  }, []);

  if (initError) {
    return (
      <LoadingSpinner message="Initialization failed. Please check the error message above and tap Retry." />
    );
  }

  if (!isInitialized) {
    return <LoadingSpinner message="Initializing database..." />;
  }

  return (
    <NetworkStatusProvider>
      <AppNavigator />
    </NetworkStatusProvider>
  );
}

// Main App Component
export default function App() {
  return (
    <Provider store={store}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <AppWithDatabase />
    </Provider>
  );
}