import type { TabBarViewProps } from "./TabBarView.types";
import { Pressable, View, Text, StyleSheet } from "react-native";

export function TabBarView({
	tabs,
	selectedTab,
	onTabSelect,
	style,
}: TabBarViewProps) {
	return (
		<View style={[styles.container, style]}>
			<View style={styles.tabRow}>
				{tabs
					.filter((tab) => !tab.isMenuTrigger)
					.map((tab) => {
						const isActive = tab.name === selectedTab;
						return (
							<Pressable
								key={tab.name}
								onPress={() => onTabSelect?.(tab.name)}
								style={styles.tab}
							>
								<Text
									style={[
										styles.tabLabel,
										isActive && styles.tabLabelActive,
									]}
								>
									{tab.label}
								</Text>
							</Pressable>
						);
					})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		justifyContent: "flex-end",
	},
	tabRow: {
		flexDirection: "row",
		backgroundColor: "#18181b",
		borderTopWidth: 0.5,
		borderTopColor: "#27272a",
		paddingBottom: 20,
		paddingTop: 8,
	},
	tab: {
		flex: 1,
		alignItems: "center",
		paddingVertical: 6,
	},
	tabLabel: {
		fontSize: 11,
		color: "#71717a",
	},
	tabLabelActive: {
		color: "#ffffff",
	},
});
