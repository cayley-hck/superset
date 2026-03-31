import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/useTheme";
import { OrganizationAvatar } from "./components/OrganizationAvatar";

export interface Organization {
	id: string;
	name: string;
	slug?: string | null;
	logo?: string | null;
}

export function OrganizationSwitcherSheet({
	isPresented,
	onIsPresentedChange,
	organizations,
	activeOrganizationId,
	onSwitchOrganization,
}: {
	isPresented: boolean;
	onIsPresentedChange: (value: boolean) => void;
	organizations: Organization[];
	activeOrganizationId?: string | null;
	onSwitchOrganization: (organizationId: string) => void;
	width?: number;
}) {
	const theme = useTheme();

	if (!isPresented) return null;

	return (
		<Modal
			visible={isPresented}
			transparent
			animationType="fade"
			onRequestClose={() => onIsPresentedChange(false)}
		>
			<Pressable
				style={{
					flex: 1,
					backgroundColor: "rgba(0,0,0,0.5)",
					justifyContent: "flex-end",
				}}
				onPress={() => onIsPresentedChange(false)}
			>
				<Pressable
					style={{
						backgroundColor: theme.background,
						borderTopLeftRadius: 16,
						borderTopRightRadius: 16,
						maxHeight: "60%",
					}}
					onPress={(e) => e.stopPropagation()}
				>
					<View
						style={{
							width: 36,
							height: 4,
							borderRadius: 2,
							backgroundColor: theme.mutedForeground,
							alignSelf: "center",
							marginTop: 8,
							opacity: 0.4,
						}}
					/>
					<View className="px-5 pb-3 pt-6">
						<Text
							className="mb-2 text-sm font-semibold"
							style={{ color: theme.mutedForeground }}
						>
							Organizations
						</Text>
						{organizations.map((organization) => {
							const isActive = organization.id === activeOrganizationId;
							return (
								<Pressable
									key={organization.id}
									onPress={() => onSwitchOrganization(organization.id)}
									className="flex-row items-center gap-2.5 py-2.5"
								>
									<OrganizationAvatar
										name={organization.name}
										logo={organization.logo}
										size={32}
									/>
									<View className="flex-1">
										<Text
											className="text-sm font-medium"
											style={{ color: theme.foreground }}
										>
											{organization.name}
										</Text>
										{organization.slug ? (
											<Text
												className="text-xs"
												style={{
													color: theme.mutedForeground,
												}}
											>
												superset.sh/{organization.slug}
											</Text>
										) : null}
									</View>
									{isActive ? (
										<Ionicons
											name="checkmark-circle"
											size={18}
											color={theme.primary}
										/>
									) : null}
								</Pressable>
							);
						})}
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
}
