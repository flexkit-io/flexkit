import { useCallback, useMemo, useState } from 'react';
import { PlusIcon, TagIcon, Trash2Icon } from 'lucide-react';
import {
  Button,
  Input,
  ScrollArea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@flexkit/studio/ui';
import {
  gql,
  useAppContext,
  useEntityMutation,
  useEntityQuery,
  getEntityDeleteMutation,
  tagSchema,
} from '@flexkit/studio';
import { getEntityCreateMutation, getEntityQuery } from '../../flexkit-studio/src/graphql-client/queries';
import type { EntityData } from '../../flexkit-studio/src/graphql-client/types';

type TagItem = { _id: string; name: string };

export function Sidebar(): JSX.Element {
  const { scope } = useAppContext();
  const schema = useMemo(() => [tagSchema], []);
  const [runMutation, setMutation, setOptions] = useEntityMutation();
  const [newTagName, setNewTagName] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [tagToDelete, setTagToDelete] = useState<TagItem | null>(null);

  const entityName = '_tag';
  const entityNamePlural = '_tags';
  const variables = useMemo(() => ({ where: {}, options: { limit: 200, offset: 0, sort: [{ name: 'ASC' }] } }), []);
  const { data, isLoading } = useEntityQuery({
    entityNamePlural,
    schema,
    scope,
    variables,
  });

  const tags: TagItem[] = (Array.isArray(data) ? (data as unknown[]) : []).map((item) => {
    const it = item as { _id: string; name: string };
    return { _id: it._id, name: it.name };
  });

  const handleCreate = useCallback(async (): Promise<void> => {
    const name = newTagName.trim();

    if (!name) {
      return;
    }

    const _id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const entityData = { name: { value: name, disabled: false, scope: 'default' } } as unknown as EntityData;
    const mutation = getEntityCreateMutation(entityNamePlural, schema, entityData, _id);
    const entityQuery = getEntityQuery(entityNamePlural, scope, schema);
    const refreshQuery = gql`
      ${entityQuery.query}
    `;

    await new Promise<void>((resolve) => {
      setMutation(gql`
        ${mutation}
      `);
      setOptions({
        refetchQueries: [refreshQuery],
        onCompleted: () => {
          setNewTagName('');
          setIsDialogOpen(false);
          resolve();
        },
      });
      runMutation(true);
    });
  }, [entityNamePlural, runMutation, schema, scope, setMutation, setOptions, newTagName]);

  const handleDelete = useCallback(
    async (_id: string): Promise<void> => {
      const mutation = getEntityDeleteMutation(entityName, schema, _id);
      const entityQuery = getEntityQuery(entityNamePlural, scope, schema);
      const refreshQuery = gql`
        ${entityQuery.query}
      `;

      await new Promise<void>((resolve) => {
        setMutation(gql`
          ${mutation}
        `);
        setOptions({
          variables: { where: { _id } },
          refetchQueries: [refreshQuery],
          onCompleted: () => {
            resolve();
          },
        });
        runMutation(true);
      });
    },
    [entityName, entityNamePlural, runMutation, schema, scope, setMutation, setOptions]
  );

  return (
    <div className="fk-flex fk-h-full fk-max-h-screen fk-flex-col fk-gap-2">
      <div className="fk-flex fk-h-12 fk-items-center fk-border-b fk-border-b-border fk-px-4 fk-lg:fk-h-[60px] fk-lg:fk-px-6">
        <TagIcon className="fk-h-4 fk-w-4" />
        <span className="fk-px-4 fk-text-sm fk-font-semibold fk-tracking-tight">Tags</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="icon" className="fk-ml-auto fk-h-8 fk-w-8">
                    <PlusIcon className="fk-h-4 fk-w-4" />
                    <span className="fk-sr-only">Add tag</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New tag</DialogTitle>
                  </DialogHeader>
                  <div className="fk-flex fk-gap-2">
                    <Input
                      autoFocus
                      value={newTagName}
                      placeholder="New tag name"
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void handleCreate();
                        }
                      }}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreate} variant="default">
                      Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add tag</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <ScrollArea className="fk-h-full">
        <div className="fk-flex fk-flex-col fk-gap-2 fk-px-4 fk-py-2">
          {isLoading ? (
            <div className="fk-text-sm fk-text-muted-foreground">Loading...</div>
          ) : tags.length === 0 ? (
            <div className="fk-text-sm fk-text-muted-foreground">No tags yet</div>
          ) : (
            tags.map((tag) => (
              <div
                key={tag._id}
                className="fk-group fk-flex fk-items-center fk-justify-between fk-rounded fk-border fk-border-border fk-bg-card fk-px-3 fk-py-2"
              >
                <span className="fk-text-sm">{tag.name}</span>
                <Button
                  aria-label={`Remove ${tag.name}`}
                  title={`Remove ${tag.name}`}
                  onClick={() => {
                    setTagToDelete(tag);
                    setIsDeleteOpen(true);
                  }}
                  variant="ghost"
                  size="icon"
                  className="fk-h-7 fk-w-7 fk-text-muted-foreground hover:fk-text-foreground"
                >
                  <Trash2Icon className="fk-h-4 fk-w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tag</DialogTitle>
          </DialogHeader>
          <div className="fk-text-sm fk-text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="fk-font-semibold fk-text-foreground">{tagToDelete?.name}</span>?
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteOpen(false);
                setTagToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!tagToDelete) {
                  return;
                }

                void (async () => {
                  await handleDelete(tagToDelete._id);
                  setIsDeleteOpen(false);
                  setTagToDelete(null);
                })();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
