import clsx from 'clsx';
import { Columns, GridFour, Icon, MonitorPlay, Rows } from 'phosphor-react';
import {
	HTMLAttributes,
	PropsWithChildren,
	ReactNode,
	isValidElement,
	memo,
	useState
} from 'react';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { useKey } from 'rooks';
import { ExplorerItem, isPath, useLibraryContext, useLibraryMutation } from '@sd/client';
import { ContextMenu } from '@sd/ui';
import { useExplorerConfigStore } from '~/hooks';
import { ExplorerLayoutMode, getExplorerStore, useExplorerStore } from '~/hooks';
import { usePlatform } from '~/util/Platform';
import {
	ExplorerViewContext,
	ExplorerViewSelection,
	ViewContext,
	useExplorerViewContext
} from '../ViewContext';
import { getItemFilePath } from '../util';
import GridView from './GridView';
import ListView from './ListView';
import MediaView from './MediaView';

interface ViewItemProps extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {
	data: ExplorerItem;
}

export const ViewItem = ({ data, children, ...props }: ViewItemProps) => {
	const explorerStore = useExplorerStore();
	const explorerView = useExplorerViewContext();
	const { library } = useLibraryContext();
	const navigate = useNavigate();

	const { openFilePath } = usePlatform();
	const updateAccessTime = useLibraryMutation('files.updateAccessTime');
	const filePath = getItemFilePath(data);

	const explorerConfig = useExplorerConfigStore();

	const onDoubleClick = () => {
		if (isPath(data) && data.item.is_dir) {
			navigate({
				pathname: `/${library.uuid}/location/${getItemFilePath(data)?.location_id}`,
				search: createSearchParams({
					path: `${data.item.materialized_path}${data.item.name}/`
				}).toString()
			});
		} else if (
			openFilePath &&
			filePath &&
			explorerConfig.openOnDoubleClick &&
			!explorerStore.isRenaming
		) {
			if (data.type === 'Path' && data.item.object_id) {
				updateAccessTime.mutate(data.item.object_id);
			}

			openFilePath(library.uuid, filePath.id);
		}
	};

	return (
		<ContextMenu.Root
			trigger={
				<div onDoubleClick={onDoubleClick} {...props}>
					{children}
				</div>
			}
			onOpenChange={explorerView.setIsContextMenuOpen}
			disabled={!explorerView.contextMenu}
			asChild={false}
		>
			{explorerView.contextMenu}
		</ContextMenu.Root>
	);
};

export interface ExplorerViewProps<T extends ExplorerViewSelection = ExplorerViewSelection>
	extends Omit<ExplorerViewContext<T>, 'multiSelect' | 'selectable'> {
	layout: ExplorerLayoutMode;
	className?: string;
	emptyNotice?: JSX.Element | { icon?: Icon | ReactNode; message?: ReactNode } | null;
}

export default memo(({ layout, className, emptyNotice, ...contextProps }) => {
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

	useKey('Space', (e) => {
		e.preventDefault();

		if (!getExplorerStore().quickViewObject) {
			const selectedItem = contextProps.items?.find(
				(item) =>
					item.item.id ===
					(Array.isArray(contextProps.selected)
						? contextProps.selected[0]
						: contextProps.selected)
			);

			if (selectedItem) {
				getExplorerStore().quickViewObject = selectedItem;
			}
		} else {
			getExplorerStore().quickViewObject = null;
		}
	});

	const emptyNoticeIcon = (icon?: Icon) => {
		let Icon = icon;

		if (!Icon) {
			switch (layout) {
				case 'grid':
					Icon = GridFour;
					break;
				case 'media':
					Icon = MonitorPlay;
					break;
				case 'columns':
					Icon = Columns;
					break;
				case 'rows':
					Icon = Rows;
					break;
			}
		}

		return <Icon size={100} opacity={0.3} />;
	};

	return (
		<div className={clsx('h-full w-full', className)}>
			{contextProps.items === null ||
			(contextProps.items && contextProps.items.length > 0) ? (
				<ViewContext.Provider
					value={
						{
							...contextProps,
							multiSelect: Array.isArray(contextProps.selected),
							selectable: !isContextMenuOpen,
							setIsContextMenuOpen: setIsContextMenuOpen
						} as ExplorerViewContext
					}
				>
					{layout === 'grid' && <GridView />}
					{layout === 'rows' && <ListView />}
					{layout === 'media' && <MediaView />}
				</ViewContext.Provider>
			) : emptyNotice === null ? null : isValidElement(emptyNotice) ? (
				emptyNotice
			) : (
				<div className="flex h-full flex-col items-center justify-center text-ink-faint">
					{emptyNotice && 'icon' in emptyNotice
						? isValidElement(emptyNotice.icon)
							? emptyNotice.icon
							: emptyNoticeIcon(emptyNotice.icon as Icon)
						: emptyNoticeIcon()}

					<p className="mt-5 text-xs">
						{emptyNotice && 'message' in emptyNotice
							? emptyNotice.message
							: 'This list is empty'}
					</p>
				</div>
			)}
		</div>
	);
}) as <T extends ExplorerViewSelection>(props: ExplorerViewProps<T>) => JSX.Element;
