# TodoList

Offline-First Task App
React Native task manager with offline-first sync capabilities.
Features

Create, edit, delete tasks offline
Auto-sync when online
SQLite local storage
Redux state management
Last-Writer-Wins conflict resolution

Setup
bashnpm install
expo start

How It Works
All tasks stored locally in SQLite
Changes marked as "dirty" when offline
When online, pushes local changes and pulls remote changes
Mock server included for testing

Tech Stack

React Native + Expo
SQLite (expo-sqlite)
Redux Toolkit
TypeScript

Sync Protocol

GET /tasks - Pull remote changes
POST /tasks/batch - Push local changes
Bidirectional sync with conflict detection