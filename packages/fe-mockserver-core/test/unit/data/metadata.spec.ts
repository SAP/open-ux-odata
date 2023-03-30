import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import type { EntitySet } from '@sap-ux/vocabularies-types';
import { join } from 'path';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';

describe('resolveDraftRoot()', () => {
    const baseDir = join(__dirname, 'metadata', 'resolveDraftRoot');
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);

    describe('on a service with a single draft entity', () => {
        let metadata: ODataMetadata;
        let root: EntitySet;

        beforeAll(async () => {
            const edmx = await metadataProvider.loadMetadata(join(baseDir, 'SingleDraft.cds'));
            metadata = await ODataMetadata.parse(edmx, `/TestService/$metadata`);
            root = metadata.getEntitySet('DraftRoots')!;
            expect(root.name).toEqual('DraftRoots');
        });

        test('should not resolve the root from a non-draft entity', async () => {
            const entitySet = metadata.getEntitySet('OtherEntities');
            expect(entitySet).toBeDefined();

            const resolved = metadata.resolveDraftRoot(entitySet!);
            expect(resolved.found).toBeFalsy();
            expect(resolved.entitySet).toBeUndefined();
            expect(resolved.path).toHaveLength(0);
        });

        test('should resolve parent entity', async () => {
            const child = metadata.getEntitySet('OtherEntities');
            expect(child?.name).toEqual('OtherEntities');

            const entitySet = metadata.getParentEntitySetName(child!);
            expect(entitySet).toBeDefined();
            expect(entitySet).toBe('DraftRoots');
        });

        test('should resolve the root directly', async () => {
            const resolved = metadata.resolveDraftRoot(root);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(0);
        });

        test('should resolve the root from 1 level below', async () => {
            const entitySet = metadata.getEntitySet('DraftNodes_1');
            expect(entitySet).toBeDefined();

            const resolved = metadata.resolveDraftRoot(entitySet!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(1);
        });

        test('should resolve the root from 2 levels below', async () => {
            const entitySet = metadata.getEntitySet('DraftNodes_2');
            expect(entitySet).toBeDefined();

            const resolved = metadata.resolveDraftRoot(entitySet!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(2);
        });
    });

    describe('on a service with multiple draft entities', () => {
        let metadata: ODataMetadata;

        beforeAll(async () => {
            const edmx = await metadataProvider.loadMetadata(join(baseDir, 'MultiDraft.cds'));
            metadata = await ODataMetadata.parse(edmx, `/TestService/$metadata`);
        });

        test('Draft 1: should resolve the root directly', async () => {
            const root = metadata.getEntitySet('Draft_1_Roots');
            expect(root?.name).toEqual('Draft_1_Roots');

            const resolved = metadata.resolveDraftRoot(root!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(0);
        });

        test('Draft 1: should resolve the root from 1 level below', async () => {
            const root = metadata.getEntitySet('Draft_1_Roots');
            expect(root?.name).toEqual('Draft_1_Roots');

            const entitySet = metadata.getEntitySet('Draft_1_Nodes_1');
            expect(entitySet).toBeDefined();

            const resolved = metadata.resolveDraftRoot(entitySet!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(1);
        });

        test('Draft 1: should resolve the root from 2 levels below', async () => {
            const root = metadata.getEntitySet('Draft_1_Roots');
            expect(root?.name).toEqual('Draft_1_Roots');

            const entitySet = metadata.getEntitySet('Draft_1_Nodes_2');
            expect(entitySet).toBeDefined();

            const resolved = metadata.resolveDraftRoot(entitySet!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(2);
        });

        test('Draft 2: should resolve the root directly', async () => {
            const root = metadata.getEntitySet('Draft_2_Roots');
            expect(root?.name).toEqual('Draft_2_Roots');

            const resolved = metadata.resolveDraftRoot(root!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(0);
        });

        test('Draft 2: should resolve the root from 1 level below', async () => {
            const root = metadata.getEntitySet('Draft_2_Roots');
            expect(root?.name).toEqual('Draft_2_Roots');

            const entitySet = metadata.getEntitySet('Draft_2_Nodes_1');
            expect(entitySet).toBeDefined();

            const resolved = metadata.resolveDraftRoot(entitySet!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(1);
        });

        test('Draft 2: should resolve the root from 2 levels below', async () => {
            const root = metadata.getEntitySet('Draft_2_Roots');
            expect(root?.name).toEqual('Draft_2_Roots');

            const entitySet = metadata.getEntitySet('Draft_2_Nodes_2');
            expect(entitySet).toBeDefined();

            const resolved = metadata.resolveDraftRoot(entitySet!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(2);
        });
    });

    describe('on a service with multiple draft entities linked to each other', () => {
        let metadata: ODataMetadata;

        beforeAll(async () => {
            const edmx = await metadataProvider.loadMetadata(join(baseDir, 'MultiDraftLinked.cds'));
            metadata = await ODataMetadata.parse(edmx, `/TestService/$metadata`);
        });

        test('Draft 1: should resolve the root directly', async () => {
            const root = metadata.getEntitySet('Draft_1_Roots');
            expect(root?.name).toEqual('Draft_1_Roots');

            const resolved = metadata.resolveDraftRoot(root!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(0);
        });

        test('Draft 1: should resolve the root from 1 level below', async () => {
            const root = metadata.getEntitySet('Draft_1_Roots');
            expect(root?.name).toEqual('Draft_1_Roots');

            const entitySet = metadata.getEntitySet('Draft_1_Nodes_1');
            expect(entitySet).toBeDefined();

            const resolved = metadata.resolveDraftRoot(entitySet!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(1);
        });

        test('Draft 2: should resolve the root directly', async () => {
            const root = metadata.getEntitySet('Draft_2_Roots');
            expect(root?.name).toEqual('Draft_2_Roots');

            const resolved = metadata.resolveDraftRoot(root!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(0);
        });

        test('Draft 2: should resolve the root from 1 level below', async () => {
            const root = metadata.getEntitySet('Draft_2_Roots');
            expect(root?.name).toEqual('Draft_2_Roots');

            const entitySet = metadata.getEntitySet('Draft_2_Nodes_1');
            expect(entitySet).toBeDefined();

            const resolved = metadata.resolveDraftRoot(entitySet!);
            expect(resolved.found).toBeTruthy();
            expect(resolved.entitySet).toEqual(root);
            expect(resolved.path).toHaveLength(1);
        });
    });
});
