import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronRight, Flag, Lock } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { PressableCard } from "@/components/Card";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Skeleton } from "@/components/Skeleton";
import { useIsDark } from "@/hooks/useIsDark";
import {
  useFollowStatus,
  useReport,
  useToggleFollow,
  useUserAchievements,
  useUserProfile,
} from "@/hooks/users";
import { useSession } from "@/lib/auth";

export default function UserProfileScreen() {
  const { t } = useTranslation();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useSession();
  const router = useRouter();
  const isDark = useIsDark();
  const profile = useUserProfile(userId);
  const achievements = useUserAchievements(userId);
  const signedIn = session.status === "signed-in";
  const isMe = signedIn && session.user.id === userId;
  const status = useFollowStatus(userId, signedIn && !isMe);
  const toggleFollow = useToggleFollow(userId);
  const report = useReport();

  const handleReport = () => {
    report.mutate(
      { targetType: "user", targetId: userId },
      {
        onSuccess: () => Alert.alert(t("u.reportSubmitted")),
        onError: () => Alert.alert(t("u.reportFailed")),
      }
    );
  };

  const openActions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: p?.name ?? "",
          options: [t("u.report"), t("common.cancel")],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (idx) => {
          if (idx === 0) handleReport();
        }
      );
      return;
    }
    Alert.alert(p?.name ?? "", undefined, [
      { text: t("u.report"), style: "destructive", onPress: handleReport },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const onFollow = () => {
    if (!status.data) return;
    toggleFollow.mutate(status.data.isFollowing, {
      onError: (e) =>
        Alert.alert(t("u.followFailed"), String((e as Error).message)),
    });
  };

  if (profile.isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-canvas dark:bg-canvas-dark"
        edges={["top"]}
      >
        <ScreenHeader title="" back />
        <View className="items-center px-5">
          <Skeleton className="mb-3 h-24 w-24 rounded-full" />
          <Skeleton className="mb-2 h-6 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </View>
      </SafeAreaView>
    );
  }

  const p = profile.data;
  if (!p) return null;

  const stats = [
    { value: p.publicLists.length, label: t("u.statsLists") },
    { value: p.completedChallenges.length, label: t("u.statsChallenges") },
    {
      value: status.data?.followerCount ?? 0,
      label: t("u.statsFollowers"),
    },
    {
      value: status.data?.followingCount ?? 0,
      label: t("u.statsFollowing"),
    },
  ];

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScreenHeader
        title=""
        back
        right={
          !isMe && signedIn ? (
            <Pressable
              onPress={openActions}
              accessibilityLabel={t("u.report")}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-black/[0.05] dark:active:bg-white/[0.06]"
            >
              <Flag color={isDark ? "#f0ede8" : "#0c0c0b"} size={18} />
            </Pressable>
          ) : null
        }
      />

      <ScrollView contentContainerClassName="pb-10">
        <View className="items-center px-5 pb-6">
          <Avatar name={p.name} image={p.image} size={96} />
          <Text className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {p.name ?? t("common.anonymous")}
          </Text>

          <View className="mt-2 w-44">
            <View className="flex-row items-center justify-center gap-2">
              <View className="rounded-full bg-gray-900 px-2.5 py-0.5 dark:bg-gray-100">
                <Text className="text-[11px] font-semibold text-white dark:text-gray-900">
                  {t("u.level", { level: p.level.level })}
                </Text>
              </View>
            </View>
            <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <View
                className="h-full rounded-full bg-gray-900 dark:bg-gray-100"
                style={{
                  width: `${Math.round(p.level.progress * 100)}%`,
                }}
              />
            </View>
          </View>

          {!isMe && signedIn && status.data && (
            <Pressable
              onPress={onFollow}
              disabled={toggleFollow.isPending}
              className={`mt-4 flex-row items-center gap-1.5 self-center rounded-full px-5 py-2 active:opacity-80 disabled:opacity-40 ${
                status.data.isFollowing
                  ? "border border-gray-300 dark:border-gray-700"
                  : "bg-gray-900 dark:bg-gray-100"
              }`}
            >
              {status.data.isFollowing && (
                <Check
                  color={isDark ? "#f0ede8" : "#0c0c0b"}
                  size={14}
                  strokeWidth={2.5}
                />
              )}
              <Text
                className={`text-sm font-medium ${
                  status.data.isFollowing
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-white dark:text-gray-900"
                }`}
              >
                {status.data.isFollowing ? t("u.following") : t("u.follow")}
              </Text>
            </Pressable>
          )}
        </View>

        <View
          className="mx-5 mb-2 flex-row rounded-2xl bg-white p-2 dark:bg-gray-900"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          }}
        >
          {stats.map((s, i) => (
            <View
              key={s.label}
              className={`flex-1 items-center px-2 py-1 ${
                i < stats.length - 1
                  ? "border-r border-gray-100 dark:border-gray-800"
                  : ""
              }`}
            >
              <Text
                style={{ fontVariant: ["tabular-nums"] }}
                className="text-base font-semibold text-gray-900 dark:text-gray-100"
              >
                {s.value}
              </Text>
              <Text className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        <SectionLabel>{t("u.publicLists")}</SectionLabel>
        <View className="px-5">
          {p.publicLists.length === 0 ? (
            <Text className="px-1 text-sm text-gray-500 dark:text-gray-400">
              {t("u.noneYet")}
            </Text>
          ) : (
            p.publicLists.map((list) => (
              <PressableCard
                key={list.id}
                onPress={() =>
                  router.push({
                    pathname: "/explore/[listId]",
                    params: { listId: list.id },
                  })
                }
                className="mb-2 flex-row items-center gap-3 p-4"
              >
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-base font-medium text-gray-900 dark:text-gray-100"
                  >
                    {list.name}
                  </Text>
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {t("explore.itemsAndParticipants", {
                      items: list.itemCount,
                      participants: list.participantCount,
                    })}
                  </Text>
                </View>
                <ChevronRight color="#c7c5be" size={18} />
              </PressableCard>
            ))
          )}
        </View>

        <SectionLabel>{t("u.achievements")}</SectionLabel>
        <View className="px-5">
          {achievements.isLoading ? (
            <Skeleton className="h-14 w-full rounded-2xl" />
          ) : (
            (achievements.data?.achievements ?? []).map((a) => {
              const unlocked = !!a.unlockedAt;
              return (
                <View
                  key={a.type}
                  className="mb-2 flex-row items-center gap-3 rounded-2xl bg-white p-3 dark:bg-gray-900"
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }}
                >
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full ${
                      unlocked
                        ? "bg-gray-900 dark:bg-gray-100"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    {unlocked ? (
                      <Check
                        color={isDark ? "#0c0c0b" : "#ffffff"}
                        size={18}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Lock color="#a8a39a" size={16} />
                    )}
                  </View>
                  <Text
                    className={`flex-1 text-sm ${
                      unlocked
                        ? "font-medium text-gray-900 dark:text-gray-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {t(`achievements.${a.type}`)}
                  </Text>
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    {a.progress}/{a.target}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {p.completedChallenges.length > 0 && (
          <>
            <SectionLabel>{t("u.completedChallenges")}</SectionLabel>
            <View className="px-5">
              {p.completedChallenges.map((c) => (
                <View
                  key={c.id}
                  className="mb-2 rounded-2xl bg-white p-3 dark:bg-gray-900"
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }}
                >
                  <Text className="text-sm text-gray-900 dark:text-gray-100">
                    {c.name}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mt-5 mb-2 px-5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </Text>
  );
}
