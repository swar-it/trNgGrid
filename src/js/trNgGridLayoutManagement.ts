﻿module TrNgGrid {
    export enum GridSectionType {
        Enforced,
        Header,
        Body,
        Footer
    } 

    export interface IGridColumnOptions {
        displayName?: string;
        displayAlign?: string;
        displayFormat?: string;
        enableSorting?: boolean;
        enableFiltering?: boolean;
        cellWidth?: string;
        cellHeight?: string;
        filter?: string;

        displayItemFieldName?: string;
        columnTitle?: string;
        fieldName?: string;
        isLinkedToField?: boolean;
    }

    export interface IGridColumnLayoutOptions {
        fieldName?: string;
        colspan?: number;
        isCustomized?: boolean;
        isAutoGenerated?: boolean;
        isLinkedToField?: boolean;
        isDeactivated?: boolean;
        placeholder?: ng.IAugmentedJQuery;
    }

    // it's important to assign all the fields, so they can be enumerated
    export class DefaultGridColumnLayoutOptions {
        fieldName: string = undefined;
        colspan: number = undefined;
        isCustomized: boolean = undefined;
        isAutoGenerated: boolean = undefined;
        isLinkedToField: boolean = undefined;
        isDeactivated: boolean = undefined;
        placeholder: ng.IAugmentedJQuery = undefined;        
    }

    export class GridLayoutRow {
        cells: Array<IGridColumnLayoutOptions> =[];

        constructor(
            private gridConfiguration: IGridConfiguration,
            private gridLayout: GridLayout,
            private gridSectionType: GridSectionType) {
        }

        swapCells(firstCellIndex: number, secondCellIndex: number) {
            var firstCell = this.cells[firstCellIndex];
            var secondCell = this.cells[secondCellIndex];

            this.gridConfiguration.debugMode && log("About to swap cells ["+firstCell.fieldName+"] and ["+secondCell.fieldName+"] in section " + this.gridSectionType);

            this.cells.splice(firstCellIndex, 1, secondCell);
            this.cells.splice(secondCellIndex, 1, firstCell);
        }

        findCell(fieldName: string):IGridColumnLayoutOptions {
            for (var cellIndex = 0; cellIndex < this.cells.length; cellIndex++) {
                if (this.cells[cellIndex].fieldName === fieldName) {
                    return this.cells[cellIndex];
                }
            }

            return null;
        }

        registerCell(cell: IGridColumnLayoutOptions, index?: number) {
            if (!cell.fieldName) {
                throw 'A field name was not provided';
            }

            var cellFound = false;
            if (index === undefined) {
                for (var cellIndex = 0; (cellIndex < this.cells.length) && (!cellFound); cellIndex++) {
                    if (this.cells[cellIndex].fieldName === cell.fieldName) {
                        this.gridConfiguration.debugMode && log("A layout cell [" + cell.fieldName + "] is about to be updated in section " + this.gridSectionType);
                        this.cells[cellIndex] = cell;
                        cellFound = true;
                    }
                }
            }

            if (!cellFound) {
                this.gridConfiguration.debugMode && log("A new layout cell [" + cell.fieldName + "] is about to be registered in section " + this.gridSectionType);
                if (index === undefined || index === this.cells.length) {
                    this.cells.push(cell);
                }
                else {
                    this.cells.splice(index, 0, cell);
                }
            }

            this.gridLayout.triggerReconciliation();
        }

        unregisterCell(cell: IGridColumnLayoutOptions) {
            for (var cellIndex = 0; cellIndex < this.cells.length; cellIndex++) {
                if (this.cells[cellIndex] === cell) {
                    debugger;
                    this.gridConfiguration.debugMode && log("A layout cell [" + cell.fieldName + "] is about to get unregistered in section " + this.gridSectionType);
                    this.cells.splice(cellIndex, 1);
                    this.gridLayout.triggerReconciliation();
                    return;
                }
            }            
        }
    }

    /*
     * Holds details about a section (e.g. head, body, footer)
     * including the row composition.
     */
    export class GridLayoutSection {
        rows: Array<GridLayoutRow> = [];

        constructor(private gridConfiguration: IGridConfiguration, private gridLayout: GridLayout, public gridSectionType: GridSectionType) {            
        }

        registerRow(): GridLayoutRow {
            var row = new GridLayoutRow(this.gridConfiguration, this.gridLayout, this.gridSectionType);
            this.rows.push(row);
            this.gridConfiguration.debugMode && log("A new layout row ["+this.rows.length+"] was registered in section " + this.gridSectionType);
            this.gridLayout.triggerReconciliation();
            return row;
        }

        unregisterRow(row: GridLayoutRow) {
            for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
                if (this.rows[rowIndex] === row) {
                    this.rows.splice(rowIndex, 1);
                    this.gridConfiguration.debugMode && log("A layout row was unregistered in section " + this.gridSectionType);
                    this.gridLayout.triggerReconciliation();
                    return;
                }
            }
        }

        clear() {
            this.rows.splice(0);
            this.gridConfiguration.debugMode && log("Layout section " + this.gridSectionType + " got cleared");
            this.gridLayout.triggerReconciliation();
        }
    }

    /*
     * Holds details about the available sections in the grid.
     */
    export class GridLayout {
        private sections: Array<GridLayoutSection> = new Array(GridSectionType.Body + 1);
        private reconciliationTriggerKey = "triggerGridReconciliation";
        private reconciling:boolean = false;

        constructor(
            private gridConfiguration: IGridConfiguration,
            private gridOptions: IGridOptions) {

            this.setupListeners();
        }

        getSection(section: GridSectionType):GridLayoutSection {
            var colSection = this.sections[section];
            if (!colSection) {
                this.sections[<number>section] = colSection = new GridLayoutSection(this.gridConfiguration, this, section);
                this.gridConfiguration.debugMode && log("A new layout section [" + section + "] was registered");
                this.triggerReconciliation();
            }

            return colSection;
        }

        triggerReconciliation() {
            this.gridOptions[this.reconciliationTriggerKey] = true;
        }

        private setupListeners() {
            // watch for a reconciliation trigger
            this.gridOptions.$watch(this.reconciliationTriggerKey,(reconciliationTriggered: boolean) => {
                if (reconciliationTriggered) {
                    //http://www.bennadel.com/blog/2751-scope-applyasync-vs-scope-evalasync-in-angularjs-1-3.htm
                    this.gridOptions.$applyAsync(() => {
                        this.reconcile();
                    });
                }
            });

            var itemsFieldExtractionWatcherDereg: Function = null;

            //watch for changes in items
            itemsFieldExtractionWatcherDereg = this.gridOptions.$watch("items.length",(newLength: number) => {
                if (newLength) {
                    this.enforceFields(extractFields(this.gridOptions.items[0]));

                    // after seeing at least an item, there is no need to keep watching
                    if (itemsFieldExtractionWatcherDereg) {
                        itemsFieldExtractionWatcherDereg();
                        itemsFieldExtractionWatcherDereg = null;
                    }
                }
            });            

            //watch for changes in the fields attribute
            if (this.gridOptions.fields) {
                this.enforceFields(this.gridOptions.fields);

                // no need to wait for items to arrive
                if (itemsFieldExtractionWatcherDereg) {
                    itemsFieldExtractionWatcherDereg();
                    itemsFieldExtractionWatcherDereg = null;
                }
            }
            this.gridOptions.$watchCollection("fields",(newFields: Array<string>, oldFields: Array<string>) => {
                if (!angular.equals(newFields, oldFields)) {
                    this.enforceFields(newFields || []);

                    // no need to wait for items to arrive
                    if (itemsFieldExtractionWatcherDereg) {
                        itemsFieldExtractionWatcherDereg();
                        itemsFieldExtractionWatcherDereg = null;
                    }
                }
            });
        }

        private enforceFields(fields: Array<string>) {
            var enforcedSection = this.getSection(GridSectionType.Enforced);

            if (fields) {
                enforcedSection.clear();
                var enforcedSectionVirtualRow = enforcedSection.registerRow();

                angular.forEach(fields,(fieldName) => {
                    var enforcedCellLayout = new DefaultGridColumnLayoutOptions();
                    enforcedCellLayout.fieldName = fieldName;
                    enforcedCellLayout.isAutoGenerated = true;
                    enforcedCellLayout.isLinkedToField = true;
                    enforcedSectionVirtualRow.registerCell(enforcedCellLayout);
                });
            }
            else {
                enforcedSection.clear();
            }
        }

        private reconcile() {
            try {
                this.gridConfiguration.debugMode && log("Starting to reconcile all the rows");

                // fetch all the field names from the first section with fields present
                var extractedFieldNames = new Array<string>();

                var sectionIndex: number;
                for (sectionIndex = GridSectionType.Enforced; sectionIndex <= GridSectionType.Header && extractedFieldNames.length === 0; sectionIndex++) {
                    angular.forEach(this.getSection(sectionIndex).rows, (row: GridLayoutRow) => {
                        angular.forEach(row.cells, (cell: IGridColumnLayoutOptions) => {
                            if (cell.isLinkedToField) {
                                extractedFieldNames.push(cell.fieldName);
                            }
                        });
                    });
                };

                // now enforce the fields
                var preparedRows = new Array<GridLayoutRow>();
                for (sectionIndex = GridSectionType.Enforced; sectionIndex <= GridSectionType.Body; sectionIndex++) {
                    angular.forEach(this.getSection(sectionIndex).rows,(row: GridLayoutRow) => {
                        if (sectionIndex !== GridSectionType.Enforced) {
                            // do not clean the enforced field section
                            this.cleanupRowForReconciliation(row, extractedFieldNames);
                        }
                        preparedRows.push(row);
                    });
                };

                // and finally reconcile the cells
                for (var rowIndex = 0; rowIndex < preparedRows.length - 1; rowIndex++) {
                    this.reconcileRows(preparedRows[rowIndex], preparedRows[rowIndex + 1]);
                }
            }
            finally {
                this.gridOptions[this.reconciliationTriggerKey] = false;
            }
        }

        private reconcileRows(enforcedRow: GridLayoutRow, targetRow: GridLayoutRow) {
            // the template represents the source
            var currentTargetRowCellIndex = 0;
            for (var enforcedCellIndex = 0; enforcedCellIndex < enforcedRow.cells.length; enforcedCellIndex++) {
                var enforcedCell = enforcedRow.cells[enforcedCellIndex];
                if (enforcedCell.isDeactivated) {
                    continue;
                }

                // we need to fill up possible gaps in the target rows in order to match the template
                // try to find a match
                var matchNotFound = true;
                var targetCell: IGridColumnLayoutOptions;
                for (var targetCellIndex = currentTargetRowCellIndex; matchNotFound && targetCellIndex < targetRow.cells.length; targetCellIndex++) {
                    targetCell = targetRow.cells[targetCellIndex];

                    if (targetCell && !targetCell.isDeactivated && targetCell.isLinkedToField == enforcedCell.isLinkedToField && (!targetCell.isLinkedToField || (targetCell.fieldName === enforcedCell.fieldName))) {
                        matchNotFound = false;
                    }
                }

                if (matchNotFound) {
                    // need to match the template
                    targetCell = angular.extend({}, enforcedCell);
                    targetCell.isAutoGenerated = true;
                    targetCell.isCustomized = false;
                    targetRow.registerCell(targetCell, currentTargetRowCellIndex);
                }
                else {
                    targetCellIndex --;
                    if (targetCellIndex !== currentTargetRowCellIndex) {
                        // we need to switch cells
                        targetRow.swapCells(targetCellIndex, currentTargetRowCellIndex);
                    }
                }

                currentTargetRowCellIndex++;
            }

            // deactivate everything that's left
            while (currentTargetRowCellIndex < targetRow.cells.length) {
                var extraCellRegistration = targetRow.cells[currentTargetRowCellIndex];
                if (extraCellRegistration.isAutoGenerated) {
                    targetRow.unregisterCell(extraCellRegistration);
                }
                else {
                    extraCellRegistration.isDeactivated = true;
                    currentTargetRowCellIndex++;
                }
            }
        }

        private cleanupRowForReconciliation(targetRow: GridLayoutRow, fields: Array<string>) {
            for (var cellRegistrationIndex = 0; cellRegistrationIndex < targetRow.cells.length; cellRegistrationIndex++) {
                var cellRegistration = targetRow.cells[cellRegistrationIndex];
                if (cellRegistration.isAutoGenerated) {
                    targetRow.unregisterCell(cellRegistration);
                    cellRegistrationIndex--;
                }
                else {
                    cellRegistration.isDeactivated = cellRegistration.isLinkedToField && (fields.indexOf(cellRegistration.fieldName) < 0);
                }
            }
        }
    }

    /*
     * Controller responsible for properly setting up the cells
     */
    export class GridColumnController {
        constructor() {
        }

        prepareColumnSettingsScope(columnScope: IGridColumnScope, settingsScope: IGridColumnScope) {
            settingsScope.$on("$destroy",() => {
                debugger;
                columnScope.$destroy();
            });

            var isMonitoringLayoutUpdates = false;

            monitorScope(
                settingsScope,
                new GridConfigurationDefaultColumnOptions(),
                (newOptions: IGridColumnOptions) => {
                    this.registerColumnOptions(columnScope, newOptions);

                    if (!isMonitoringLayoutUpdates) {
                        monitorScope(
                            settingsScope,
                            new DefaultGridColumnLayoutOptions(),
                            (newLayoutOptions: IGridColumnOptions) => {
                                newLayoutOptions.isLinkedToField = columnScope.gridColumnOptions.isLinkedToField;
                                this.registerColumnLayoutOptions(columnScope, newLayoutOptions);
                            });
                        isMonitoringLayoutUpdates = true;
                    }
                });
        }

        prepareAutoGeneratedColumnScope(columnScope: IGridColumnScope) {
            // we expect these ones to have the layout options set
            if (!columnScope.gridColumnLayout) {
                throw "Expecting a grid column layout for the auto-generated cell";
            }

            columnScope.gridColumnOptions = columnScope.grid.getColumnOptions(columnScope.gridColumnLayout.fieldName);
            if (!columnScope.gridColumnOptions) {
                // we have no column options for this field, register it
                columnScope.gridColumnOptions = { fieldName: columnScope.gridColumnLayout.fieldName };
                columnScope.grid.setColumnOptions(columnScope.gridColumnOptions);
            }
        }

        private registerColumnOptions(columnScope:IGridColumnScope, updatedColumnOptions: IGridColumnOptions) {
            updatedColumnOptions = columnScope.grid.setColumnOptions(updatedColumnOptions);
            columnScope.gridColumnOptions = updatedColumnOptions;
        }

        private registerColumnLayoutOptions(columnScope:IGridColumnScope, updatedLayoutOptions: IGridColumnLayoutOptions) {
            if (updatedLayoutOptions.isAutoGenerated) {
                // we do not accept layout changes from auto-generated columns
                updatedLayoutOptions = columnScope.gridLayoutRow.findCell(updatedLayoutOptions.fieldName);
            }
            else {
                columnScope.gridLayoutRow.registerCell(updatedLayoutOptions);
            }

            columnScope.gridColumnLayout = updatedLayoutOptions;
        } 
    }

} 