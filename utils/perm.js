export function isOwnerOrManager(member) {
  if (!member) return false;
  if (member.guild?.ownerId === member.id) return true;
  if (member.permissions.has('Administrator')) return true;

  // Check ticket manager roles
  const cfg = member.client?.guildConfigs?.[member.guild.id] || null;
  const ticketMgrs = cfg?.tickets?.managerRoleIds || [];
  if (ticketMgrs.some(r => member.roles.cache.has(r))) return true;

  // Check moderation admin roles
  const adminRoles = cfg?.moderation?.adminRoleIds || [];
  if (adminRoles.some(r => member.roles.cache.has(r))) return true;

  return member.permissions.has('ManageGuild');
}

export function isAdmin(member, cfg) {
  if (!member || !cfg) return false;
  if (member.permissions.has('Administrator')) return true;

  const adminRoles = cfg?.moderation?.adminRoleIds || [];
  return adminRoles.some(r => member.roles.cache.has(r));
}

export function isMod(member, cfg) {
  if (!member || !cfg) return false;
  if (isAdmin(member, cfg)) return true;
  if (member.permissions.any(['KickMembers', 'BanMembers', 'ModerateMembers'])) return true;

  const modRoles = cfg?.moderation?.modRoleIds || [];
  const staffRoles = cfg?.tickets?.staffRoleIds || [];
  return [...modRoles, ...staffRoles].some(r => member.roles.cache.has(r));
}
