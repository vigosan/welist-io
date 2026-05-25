import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFollowStatus,
  useToggleFollow,
  useUserAchievements,
  useUserProfile,
} from "@/hooks/users";
import { useSession } from "@/lib/auth";
import { ACHIEVEMENT_LABELS } from "@/lib/achievement-labels";

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useSession();
  const router = useRouter();
  const profile = useUserProfile(userId);
  const achievements = useUserAchievements(userId);
  const signedIn = session.status === "signed-in";
  const isMe = signedIn && session.user.id === userId;
  const status = useFollowStatus(userId, signedIn && !isMe);
  const toggleFollow = useToggleFollow(userId);

  const onFollow = () => {
    if (!status.data) return;
    toggleFollow.mutate(status.data.isFollowing, {
      onError: (e) =>
        Alert.alert("Could not update", String((e as Error).message)),
    });
  };

  if (profile.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <ActivityIndicator className="mt-10" />
      </SafeAreaView>
    );
  }

  const p = profile.data;
  if (!p) return null;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Stack.Screen
        options={{ title: p.name ?? "Profile", headerShown: true }}
      />

      <ScrollView contentContainerClassName="px-6 pb-10 pt-4">
        <Text className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {p.name ?? "Anonymous"}
        </Text>

        {status.data && (
          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {status.data.followerCount} followers · {status.data.followingCount}{" "}
            following
          </Text>
        )}

        {!isMe && signedIn && status.data && (
          <Pressable
            onPress={onFollow}
            disabled={toggleFollow.isPending}
            className={`mt-4 self-start rounded-xl px-5 py-2.5 active:opacity-80 disabled:opacity-40 ${
              status.data.isFollowing
                ? "border border-gray-200 dark:border-gray-700"
                : "bg-gray-900 dark:bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                status.data.isFollowing
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-white dark:text-gray-900"
              }`}
            >
              {status.data.isFollowing ? "Following" : "Follow"}
            </Text>
          </Pressable>
        )}

        <Text className="mt-8 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Public lists
        </Text>
        {p.publicLists.length === 0 && (
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            None yet.
          </Text>
        )}
        {p.publicLists.map((list) => (
          <Pressable
            key={list.id}
            onPress={() =>
              router.push({
                pathname: "/explore/[listId]",
                params: { listId: list.id },
              })
            }
            className="mb-2 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
          >
            <Text
              numberOfLines={1}
              className="text-base font-medium text-gray-900 dark:text-gray-100"
            >
              {list.name}
            </Text>
            <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {list.itemCount} items · {list.participantCount} participants
            </Text>
          </Pressable>
        ))}

        <Text className="mt-8 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Achievements
        </Text>
        {achievements.isLoading ? (
          <ActivityIndicator />
        ) : (
          (achievements.data?.achievements ?? []).map((a) => {
            const unlocked = !!a.unlockedAt;
            return (
              <View
                key={a.type}
                className={`mb-2 flex-row items-center justify-between rounded-2xl border p-3 ${
                  unlocked
                    ? "border-gray-900 bg-white dark:border-gray-100 dark:bg-gray-900"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                }`}
              >
                <Text
                  className={`flex-1 text-sm ${
                    unlocked
                      ? "font-medium text-gray-900 dark:text-gray-100"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {ACHIEVEMENT_LABELS[a.type] ?? a.type}
                </Text>
                <Text className="ml-3 text-xs text-gray-500 dark:text-gray-400">
                  {a.progress}/{a.target}
                </Text>
              </View>
            );
          })
        )}

        {p.completedChallenges.length > 0 && (
          <>
            <Text className="mt-8 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Completed challenges
            </Text>
            {p.completedChallenges.map((c) => (
              <View
                key={c.id}
                className="mb-2 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
              >
                <Text className="text-sm text-gray-900 dark:text-gray-100">
                  {c.name}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
