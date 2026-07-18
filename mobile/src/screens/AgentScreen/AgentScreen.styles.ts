import { StyleSheet } from 'react-native';
import { spacing, radii } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  bubbleContainer: {
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 14,
    borderRadius: radii.lg,
  },
  userBubble: {
    backgroundColor: '#c75c2a', // primary terracotta
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fffaf4', // surface warm white
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(18, 76, 90, 0.08)',
  },
  userText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
  },
  assistantText: {
    color: '#23160f', // onSurface
    fontSize: 16,
    lineHeight: 22,
  },
  
  // Reasoning styling
  reasoningBlock: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    padding: 10,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(18, 76, 90, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#124c5a', // secondary teal
  },
  reasoningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#124c5a',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasoningText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#5f4a3d', // onSurfaceVariant
    lineHeight: 18,
  },

  // Tools executed styling
  toolsBlock: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    gap: 6,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  toolBadgeRunning: {
    backgroundColor: 'rgba(241, 179, 139, 0.1)',
    borderColor: '#c75c2a',
  },
  toolBadgeCompleted: {
    backgroundColor: 'rgba(18, 76, 90, 0.05)',
    borderColor: '#124c5a',
  },
  toolText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  toolTextRunning: {
    color: '#c75c2a',
  },
  toolTextCompleted: {
    color: '#124c5a',
  },

  traceText: {
    marginTop: 6,
    fontSize: 10,
    color: '#a89b93',
  },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(18, 76, 90, 0.08)',
    backgroundColor: '#fffaf4',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(35, 22, 15, 0.12)',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: '#23160f',
    backgroundColor: '#ffffff',
    marginRight: spacing.sm,
  },
  inputFocused: {
    borderColor: '#124c5a',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: '#c75c2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f1b38b',
    opacity: 0.6,
  },
});
