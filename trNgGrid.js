﻿/// <reference path="../../../typings/angularjs/angular.d.ts"/>
"use strict";
var TrNgGrid;
(function (TrNgGrid) {
    (function (SelectionMode) {
        SelectionMode[SelectionMode["None"] = 0] = "None";
        SelectionMode[SelectionMode["SingleRow"] = 1] = "SingleRow";
        SelectionMode[SelectionMode["MultiRow"] = 2] = "MultiRow";
        SelectionMode[SelectionMode["MultiRowWithKeyModifiers"] = 3] = "MultiRowWithKeyModifiers";
    })(TrNgGrid.SelectionMode || (TrNgGrid.SelectionMode = {}));
    var SelectionMode = TrNgGrid.SelectionMode;
    // it's important to assign all the default column options, so we can match them with the column attributes in the markup
    TrNgGrid.defaultColumnOptions = {
        cellWidth: null,
        cellHeight: null,
        displayAlign: null,
        displayFormat: null,
        displayName: null,
        filter: null,
        enableFiltering: null,
        enableSorting: null
    };
    TrNgGrid.translations = {};
    TrNgGrid.debugMode = false;
    var templatesConfigured = false;
    var tableDirective = "trNgGrid";
    TrNgGrid.sortFilter = tableDirective + "SortFilter";
    TrNgGrid.dataPagingFilter = tableDirective + "DataPagingFilter";
    TrNgGrid.translateFilter = tableDirective + "TranslateFilter";
    TrNgGrid.translationDateFormat = tableDirective + "DateFormat";
    TrNgGrid.dataFormattingFilter = tableDirective + "DataFormatFilter";
    //var headerDirective="trNgGridHeader";
    //var headerDirectiveAttribute = "tr-ng-grid-header";
    var bodyDirective = "trNgGridBody";
    var bodyDirectiveAttribute = "tr-ng-grid-body";
    var fieldNameAttribute = "field-name";
    var isCustomizedAttribute = "is-customized";
    var cellFooterDirective = "trNgGridFooterCell";
    var cellFooterDirectiveAttribute = "tr-ng-grid-footer-cell";
    var cellFooterTemplateDirective = "trNgGridFooterCellTemplate";
    var cellFooterTemplateDirectiveAttribute = "tr-ng-grid-footer-cell-template";
    TrNgGrid.cellFooterTemplateId = cellFooterTemplateDirective + ".html";
    var globalFilterDirective = "trNgGridGlobalFilter";
    TrNgGrid.globalFilterDirectiveAttribute = "tr-ng-grid-global-filter";
    TrNgGrid.footerGlobalFilterTemplateId = globalFilterDirective + ".html";
    var pagerDirective = "trNgGridPager";
    TrNgGrid.pagerDirectiveAttribute = "tr-ng-grid-pager";
    TrNgGrid.footerPagerTemplateId = pagerDirective + ".html";
    var cellHeaderDirective = "trNgGridHeaderCell";
    var cellHeaderDirectiveAttribute = "tr-ng-grid-header-cell";
    var cellHeaderTemplateDirective = "trNgGridHeaderCellTemplate";
    var cellHeaderTemplateDirectiveAttribute = "tr-ng-grid-header-cell-template";
    TrNgGrid.cellHeaderTemplateId = cellHeaderTemplateDirective + ".html";
    var cellBodyDirective = "trNgGridBodyCell";
    var cellBodyDirectiveAttribute = "tr-ng-grid-body-cell";
    var cellBodyTemplateDirective = "trNgGridBodyCellTemplate";
    var cellBodyTemplateDirectiveAttribute = "tr-ng-grid-body-cell-template";
    TrNgGrid.cellBodyTemplateId = cellBodyTemplateDirective + ".html";
    var columnSortDirective = "trNgGridColumnSort";
    TrNgGrid.columnSortDirectiveAttribute = "tr-ng-grid-column-sort";
    TrNgGrid.columnSortTemplateId = columnSortDirective + ".html";
    var columnFilterDirective = "trNgGridColumnFilter";
    TrNgGrid.columnFilterDirectiveAttribute = "tr-ng-grid-column-filter";
    TrNgGrid.columnFilterTemplateId = columnFilterDirective + ".html";
    var findChildByTagName = function (parent, childTag) {
        childTag = childTag.toUpperCase();
        var children = parent.children();
        for (var childIndex = 0; childIndex < children.length; childIndex++) {
            var childElement = children[childIndex];
            if (childElement.tagName == childTag) {
                return angular.element(childElement);
            }
        }
        return null;
    };
    var findChildrenByTagName = function (parent, childTag) {
        childTag = childTag.toUpperCase();
        var retChildren = [];
        var children = parent.children();
        for (var childIndex = 0; childIndex < children.length; childIndex++) {
            var childElement = children[childIndex];
            if (childElement.tagName == childTag) {
                retChildren.push(angular.element(childElement));
            }
        }
        return retChildren;
    };
    /**
     * Combines two sets of cell infos. The first set will take precedence in the checks but the combined items will contain items from the second set if they match.
     */
    var combineGridCellInfos = function (firstSet, secondSet, addExtraFieldItemsSecondSet, addExtraNonFieldItemsSecondSet) {
        var combinedSet = [];
        var secondTempSet = secondSet.slice(0);
        angular.forEach(firstSet, function (firstSetColumn) {
            // find a correspondence in the second set
            var foundSecondSetColumn = null;
            for (var secondSetColumnIndex = 0; !foundSecondSetColumn && secondSetColumnIndex < secondTempSet.length; secondSetColumnIndex++) {
                foundSecondSetColumn = secondTempSet[secondSetColumnIndex];
                if (foundSecondSetColumn.fieldName === firstSetColumn.fieldName) {
                    secondTempSet.splice(secondSetColumnIndex, 1);
                }
                else {
                    foundSecondSetColumn = null;
                }
            }
            if (foundSecondSetColumn) {
                combinedSet.push(foundSecondSetColumn);
            }
            else {
                combinedSet.push(firstSetColumn);
            }
        });
        // add the remaining items from the second set in the combined set
        if (addExtraFieldItemsSecondSet || addExtraNonFieldItemsSecondSet) {
            angular.forEach(secondTempSet, function (secondSetColumn) {
                if ((addExtraFieldItemsSecondSet && secondSetColumn.fieldName) || (addExtraNonFieldItemsSecondSet && !secondSetColumn.fieldName)) {
                    combinedSet.push(secondSetColumn);
                }
            });
        }
        return combinedSet;
    };
    var wrapTemplatedCell = function (templateElement, tAttrs, isCustomized, cellTemplateDirective) {
        if (isCustomized) {
            var childrenElements = templateElement.children();
            var firstChildElement = angular.element(childrenElements[0]);
            if (childrenElements.length !== 1 || !firstChildElement.attr(cellTemplateDirective)) {
                // wrap the children of the custom template cell
                templateElement.empty();
                var templateWrapElement = angular.element("<div></div>").attr(cellTemplateDirective, "");
                templateElement.append(templateWrapElement);
                angular.forEach(childrenElements, function (childElement) {
                    templateWrapElement.append(angular.element(childElement));
                });
            }
        }
        else {
            templateElement.empty();
            templateElement.append(angular.element("<div></div>").attr(cellTemplateDirective, ""));
        }
    };
    var TemplatedCell = (function () {
        function TemplatedCell(parent, cellElement) {
            this.parent = parent;
            this.cellElement = cellElement;
            this.fieldName = cellElement.attr(fieldNameAttribute);
            var customContent = cellElement.children();
            this.isStandardColumn = customContent.length === 0;
        }
        return TemplatedCell;
    })();
    var TemplatedSection = (function () {
        function TemplatedSection(sectionTagName, sectionDirectiveAttribute, rowDirectiveAttribute, cellTagName, cellDirectiveAttribute) {
            this.sectionTagName = sectionTagName;
            this.sectionDirectiveAttribute = sectionDirectiveAttribute;
            this.rowDirectiveAttribute = rowDirectiveAttribute;
            this.cellTagName = cellTagName;
            this.cellDirectiveAttribute = cellDirectiveAttribute;
            this.cellTagName = this.cellTagName.toUpperCase();
            this.cells = null;
        }
        TemplatedSection.prototype.configureSection = function (gridElement, columnDefs) {
            var _this = this;
            var sectionElement = this.getSectionElement(gridElement, true);
            sectionElement.empty();
            sectionElement.removeAttr("ng-non-bindable");
            // add the elements in order
            var rowElementDefinitions = combineGridCellInfos(columnDefs, this.cells, false, false);
            // grab the templated row
            var templatedRowElement = this.getTemplatedRowElement(sectionElement, true);
            angular.forEach(rowElementDefinitions, function (gridCell, index) {
                var gridCellElement;
                var templatedCell = gridCell;
                // it might not be a templated cell, beware
                if (templatedCell.parent === _this && templatedCell.cellElement) {
                    gridCellElement = templatedCell.cellElement.clone(true);
                }
                else {
                    gridCellElement = angular.element("<table><" + _this.cellTagName + "></" + _this.cellTagName + "></table>").find(_this.cellTagName);
                }
                // set it up
                if (_this.cellDirectiveAttribute) {
                    gridCellElement.attr(_this.cellDirectiveAttribute, index);
                }
                if (!gridCell.isStandardColumn) {
                    gridCellElement.attr(isCustomizedAttribute, "true");
                }
                if (gridCell.fieldName) {
                    gridCellElement.attr(fieldNameAttribute, gridCell.fieldName);
                }
                gridCellElement.attr("ng-style", "{\'width\':columnOptions.cellWidth,\'height\':columnOptions.cellHeight}");
                // finally add it to the parent
                templatedRowElement.append(gridCellElement);
            });
            return sectionElement;
        };
        TemplatedSection.prototype.extractPartialColumnDefinitions = function () {
            return this.cells;
        };
        TemplatedSection.prototype.discoverCells = function (gridElement) {
            var _this = this;
            this.cells = [];
            var templatedRow = this.getTemplatedRowElement(this.getSectionElement(gridElement, false), false);
            if (templatedRow) {
                angular.forEach(templatedRow.children(), function (childElement, childIndex) {
                    childElement = angular.element(childElement);
                    if (childElement[0].tagName === _this.cellTagName.toUpperCase()) {
                        var templateElement = childElement.clone(true);
                        _this.cells.push(new TemplatedCell(_this, templateElement));
                    }
                });
            }
        };
        TemplatedSection.prototype.getSectionElement = function (gridElement, ensurePresent) {
            var sectionElement = null;
            if (gridElement) {
                sectionElement = findChildByTagName(gridElement, this.sectionTagName);
            }
            if (!sectionElement && ensurePresent) {
                // angular strikes again: https://groups.google.com/forum/#!topic/angular/7poFynsguNw
                sectionElement = angular.element("<table><" + this.sectionTagName + "></" + this.sectionTagName + "></table>").find(this.sectionTagName);
                if (gridElement) {
                    gridElement.append(sectionElement);
                }
            }
            if (ensurePresent && this.sectionDirectiveAttribute) {
                sectionElement.attr(this.sectionDirectiveAttribute, "");
            }
            return sectionElement;
        };
        TemplatedSection.prototype.getTemplatedRowElement = function (sectionElement, ensurePresent) {
            var rowElement = null;
            if (sectionElement) {
                rowElement = findChildByTagName(sectionElement, "tr");
            }
            if (!rowElement && ensurePresent) {
                rowElement = angular.element("<table><tr></tr></table>").find("tr");
                if (sectionElement) {
                    sectionElement.append(rowElement);
                }
            }
            if (ensurePresent && this.rowDirectiveAttribute) {
                rowElement.attr(this.rowDirectiveAttribute, "");
            }
            return rowElement;
        };
        return TemplatedSection;
    })();
    var GridController = (function () {
        function GridController($compile, $parse, $timeout, $templateCache) {
            this.$compile = $compile;
            this.$parse = $parse;
            this.$timeout = $timeout;
            if (!templatesConfigured) {
                configureTemplates($templateCache);
                templatesConfigured = true;
            }
        }
        GridController.prototype.setupScope = function ($isolatedScope, $gridElement, $attrs) {
            var _this = this;
            // create a scope, used just by our grid
            var gridScope = angular.element($gridElement).scope().$new();
            // initialise the options
            this.gridOptions = {
                immediateDataRetrieval: true,
                items: [],
                fields: null,
                locale: "en",
                selectedItems: [],
                filteredItems: null,
                filteredItemsPage: null,
                filterBy: null,
                filterByFields: {},
                orderBy: null,
                orderByReverse: false,
                pageItems: null,
                currentPage: 0,
                totalItems: null,
                enableFiltering: true,
                enableSorting: true,
                selectionMode: SelectionMode[2 /* MultiRow */],
                onDataRequiredDelay: 1000,
                onDataRequired: $attrs["onDataRequired"] ? $isolatedScope["onDataRequired"] : null,
                gridColumnDefs: []
            };
            //link the outer scope with the internal one
            gridScope.gridOptions = this.gridOptions;
            gridScope.TrNgGrid = TrNgGrid;
            this.linkScope(gridScope, $isolatedScope, "gridOptions", $attrs);
            //set up watchers for some of the special attributes we support
            if (this.gridOptions.onDataRequired) {
                var retrieveDataCallback = function () {
                    _this.dataRequestPromise = null;
                    _this.gridOptions.immediateDataRetrieval = false;
                    _this.gridOptions.onDataRequired(_this.gridOptions);
                };
                var scheduleDataRetrieval = function () {
                    if (_this.dataRequestPromise) {
                        _this.$timeout.cancel(_this.dataRequestPromise);
                        _this.dataRequestPromise = null;
                    }
                    if (_this.gridOptions.immediateDataRetrieval) {
                        retrieveDataCallback();
                    }
                    else {
                        _this.dataRequestPromise = _this.$timeout(function () {
                            retrieveDataCallback();
                        }, _this.gridOptions.onDataRequiredDelay, true);
                    }
                };
                gridScope.$watch("gridOptions.currentPage", function (newValue, oldValue) {
                    if (newValue !== oldValue) {
                        scheduleDataRetrieval();
                    }
                });
                gridScope.$watchCollection("[" + "gridOptions.filterBy, " + "gridOptions.filterByFields, " + "gridOptions.orderBy, " + "gridOptions.orderByReverse, " + "gridOptions.pageItems, " + "]", function (newValues, oldValues) {
                    // everything will reset the page index, with the exception of a page index change
                    if (_this.gridOptions.currentPage !== 0) {
                        _this.gridOptions.currentPage = 0;
                        // the page index watch will activate, exit for now to avoid duplicate data requests
                        return;
                    }
                    scheduleDataRetrieval();
                });
                gridScope.$watch("gridOptions.immediateDataRetrieval", function (newValue) {
                    if (newValue && _this.dataRequestPromise) {
                        _this.$timeout.cancel(_this.dataRequestPromise);
                        retrieveDataCallback();
                    }
                });
            }
            // the new settings
            gridScope.$watch("gridOptions.selectionMode", function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    switch (newValue) {
                        case SelectionMode[0 /* None */]:
                            _this.gridOptions.selectedItems.splice(0);
                            break;
                        case SelectionMode[1 /* SingleRow */]:
                            if (_this.gridOptions.selectedItems.length > 1) {
                                _this.gridOptions.selectedItems.splice(1);
                            }
                            break;
                    }
                }
            });
            return gridScope;
        };
        GridController.prototype.speedUpAsyncDataRetrieval = function ($event) {
            if (!$event || $event.keyCode == 13) {
                this.gridOptions.immediateDataRetrieval = true;
            }
        };
        GridController.prototype.setColumnOptions = function (columnIndex, columnOptions) {
            var originalOptions = this.gridOptions.gridColumnDefs[columnIndex];
            if (!originalOptions) {
                throw "Invalid grid column options found for column index " + columnIndex + ". Please report this error.";
            }
            // copy a couple of options onto the incoming set of options
            columnOptions = angular.extend(columnOptions, originalOptions);
            // replace the original options 
            this.gridOptions.gridColumnDefs[columnIndex] = columnOptions;
        };
        GridController.prototype.toggleSorting = function (propertyName) {
            if (this.gridOptions.orderBy != propertyName) {
                // the column has changed
                this.gridOptions.orderBy = propertyName;
            }
            else {
                // the sort direction has changed
                this.gridOptions.orderByReverse = !this.gridOptions.orderByReverse;
            }
            this.speedUpAsyncDataRetrieval();
        };
        GridController.prototype.setFilter = function (fieldName, filter) {
            if (!filter) {
                delete (this.gridOptions.filterByFields[fieldName]);
            }
            else {
                this.gridOptions.filterByFields[fieldName] = filter;
            }
            // in order for someone to successfully listen to changes made to this object, we need to replace it
            this.gridOptions.filterByFields = angular.extend({}, this.gridOptions.filterByFields);
        };
        GridController.prototype.toggleItemSelection = function (filteredItems, item, $event) {
            if (this.gridOptions.selectionMode === SelectionMode[0 /* None */])
                return;
            switch (this.gridOptions.selectionMode) {
                case SelectionMode[3 /* MultiRowWithKeyModifiers */]:
                    if (!$event.ctrlKey && !$event.shiftKey && !$event.metaKey) {
                        // if neither key modifiers are pressed, clear the selection and start fresh
                        var itemIndex = this.gridOptions.selectedItems.indexOf(item);
                        this.gridOptions.selectedItems.splice(0);
                        if (itemIndex < 0) {
                            this.gridOptions.selectedItems.push(item);
                        }
                    }
                    else {
                        if ($event.ctrlKey || $event.metaKey) {
                            // the ctrl key deselects or selects the item
                            var itemIndex = this.gridOptions.selectedItems.indexOf(item);
                            if (itemIndex >= 0) {
                                this.gridOptions.selectedItems.splice(itemIndex, 1);
                            }
                            else {
                                this.gridOptions.selectedItems.push(item);
                            }
                        }
                        else if ($event.shiftKey) {
                            // clear undesired selections, if the styles are not applied
                            if (document.selection && document.selection.empty) {
                                document.selection.empty();
                            }
                            else if (window.getSelection) {
                                var sel = window.getSelection();
                                sel.removeAllRanges();
                            }
                            // the shift key will always select items from the last selected item
                            var firstItemIndex;
                            var lastSelectedItem = this.gridOptions.selectedItems[this.gridOptions.selectedItems.length - 1];
                            for (firstItemIndex = 0; firstItemIndex < filteredItems.length && filteredItems[firstItemIndex].$$_gridItem !== lastSelectedItem; firstItemIndex++)
                                ;
                            if (firstItemIndex >= filteredItems.length) {
                                firstItemIndex = 0;
                            }
                            var lastItemIndex;
                            for (lastItemIndex = 0; lastItemIndex < filteredItems.length && filteredItems[lastItemIndex].$$_gridItem !== item; lastItemIndex++)
                                ;
                            if (lastItemIndex >= filteredItems.length) {
                                throw "Invalid selection on a key modifier selection mode";
                            }
                            if (lastItemIndex < firstItemIndex) {
                                var tempIndex = firstItemIndex;
                                firstItemIndex = lastItemIndex;
                                lastItemIndex = tempIndex;
                            }
                            for (var currentItemIndex = firstItemIndex; currentItemIndex <= lastItemIndex; currentItemIndex++) {
                                var currentItem = filteredItems[currentItemIndex].$$_gridItem;
                                if (this.gridOptions.selectedItems.indexOf(currentItem) < 0) {
                                    this.gridOptions.selectedItems.push(currentItem);
                                }
                            }
                        }
                    }
                    break;
                case SelectionMode[1 /* SingleRow */]:
                    var itemIndex = this.gridOptions.selectedItems.indexOf(item);
                    this.gridOptions.selectedItems.splice(0);
                    if (itemIndex < 0) {
                        this.gridOptions.selectedItems.push(item);
                    }
                    break;
                case SelectionMode[2 /* MultiRow */]:
                    var itemIndex = this.gridOptions.selectedItems.indexOf(item);
                    if (itemIndex >= 0) {
                        this.gridOptions.selectedItems.splice(itemIndex, 1);
                    }
                    else {
                        this.gridOptions.selectedItems.push(item);
                    }
                    break;
            }
        };
        GridController.prototype.discoverTemplates = function (gridElement) {
            this.templatedHeader = new TemplatedSection("thead", null, null, "th", cellHeaderDirectiveAttribute);
            this.templatedBody = new TemplatedSection("tbody", bodyDirectiveAttribute, null, "td", cellBodyDirectiveAttribute);
            this.templatedFooter = new TemplatedSection("tfoot", null, null, "td", cellFooterDirectiveAttribute);
            this.templatedHeader.discoverCells(gridElement);
            this.templatedFooter.discoverCells(gridElement);
            this.templatedBody.discoverCells(gridElement);
        };
        GridController.prototype.getSafeFieldName = function (fieldName) {
            return fieldName.replace(/[^a-zA-Z]/g, "_");
        };
        GridController.prototype.configureTableStructure = function (parentScope, gridElement, oldScope) {
            var _this = this;
            try {
                var scope = parentScope.$new();
                gridElement.empty();
                // make sure we're no longer watching for column defs
                if (this.columnDefsItemsWatcherDeregistration) {
                    this.columnDefsItemsWatcherDeregistration();
                    this.columnDefsItemsWatcherDeregistration = null;
                }
                if (this.columnDefsFieldsWatcherDeregistration) {
                    this.columnDefsFieldsWatcherDeregistration();
                    this.columnDefsFieldsWatcherDeregistration = null;
                }
                // watch for a change in field values
                // don't be tempted to use watchcollection, it always returns same values which can't be compared
                // https://github.com/angular/angular.js/issues/2621
                // which causes us the recompile even if we don't have to
                this.columnDefsFieldsWatcherDeregistration = scope.$watch("gridOptions.fields", function (newValue, oldValue) {
                    if (!angular.equals(newValue, oldValue)) {
                        _this.configureTableStructure(parentScope, gridElement, scope);
                    }
                }, true);
                // prepare a partial list of column definitions
                var templatedHeaderPartialGridColumnDefs = this.templatedHeader.extractPartialColumnDefinitions();
                var templatedBodyPartialGridColumnDefs = this.templatedBody.extractPartialColumnDefinitions();
                var templatedFooterPartialGridColumnDefs = this.templatedFooter.extractPartialColumnDefinitions();
                var finalPartialGridColumnDefs = [];
                var fieldsEnforced = this.gridOptions.fields;
                if (fieldsEnforced) {
                    // the fields bound to the options will take precedence
                    angular.forEach(this.gridOptions.fields, function (fieldName) {
                        if (fieldName) {
                            finalPartialGridColumnDefs.push({
                                isStandardColumn: true,
                                fieldName: fieldName
                            });
                        }
                    });
                    finalPartialGridColumnDefs = combineGridCellInfos(finalPartialGridColumnDefs, templatedHeaderPartialGridColumnDefs, false, true);
                    finalPartialGridColumnDefs = combineGridCellInfos(finalPartialGridColumnDefs, templatedBodyPartialGridColumnDefs, false, true);
                }
                else {
                    // check for the header markup
                    if (templatedHeaderPartialGridColumnDefs.length > 0) {
                        // header and body will be used for fishing out the field names
                        finalPartialGridColumnDefs = combineGridCellInfos(templatedHeaderPartialGridColumnDefs, templatedBodyPartialGridColumnDefs, true, true);
                    }
                    else {
                        // the object itself will provide the field names
                        if (!this.gridOptions.items || this.gridOptions.items.length == 0) {
                            // register our interest for when we do have something to look at
                            this.columnDefsItemsWatcherDeregistration = scope.$watch("gridOptions.items.length", function (newValue, oldValue) {
                                if (newValue) {
                                    _this.configureTableStructure(parentScope, gridElement, scope);
                                }
                            });
                            return;
                        }
                        for (var propName in this.gridOptions.items[0]) {
                            {
                                finalPartialGridColumnDefs.push({
                                    isStandardColumn: true,
                                    fieldName: propName
                                });
                            }
                        }
                        // combine with the body template
                        finalPartialGridColumnDefs = combineGridCellInfos(finalPartialGridColumnDefs, templatedBodyPartialGridColumnDefs, true, true);
                    }
                }
                // it's time to make final tweaks to the instances and recompile
                if (templatedFooterPartialGridColumnDefs.length == 0) {
                    templatedFooterPartialGridColumnDefs.push({ isStandardColumn: true });
                }
                // compute the formatted field names and field exctraction expressions
                angular.forEach(finalPartialGridColumnDefs, function (columnDefs) {
                    if (columnDefs.fieldName) {
                        var fieldName = columnDefs.fieldName;
                        columnDefs.displayFieldName = _this.getSafeFieldName(fieldName);
                        // create the field extraction expression
                        // cope with special symbols in the field name (e.g. $ and @), also for the accepted notations (. or [])
                        var fieldExtractionExpression;
                        if (fieldName[0] === "[") {
                            fieldExtractionExpression = fieldName;
                        }
                        else {
                            // go ahead with the wrapping (e.g. transform field.child.extrachild[0] into [field].child.extrachild[0])
                            fieldExtractionExpression = fieldName.replace(/^([^\.]+)/g, "\[\"$1\"]");
                        }
                        columnDefs.fieldExtractionExpression = fieldExtractionExpression;
                    }
                });
                this.gridOptions.gridColumnDefs = finalPartialGridColumnDefs;
                var headerElement = this.templatedHeader.configureSection(gridElement, finalPartialGridColumnDefs);
                var footerElement = this.templatedFooter.configureSection(gridElement, templatedFooterPartialGridColumnDefs);
                var bodyElement = this.templatedBody.configureSection(gridElement, finalPartialGridColumnDefs);
                var templatedBodyRowElement = this.templatedBody.getTemplatedRowElement(bodyElement);
                var templatedHeaderRowElement = this.templatedHeader.getTemplatedRowElement(headerElement);
                bodyElement.attr(bodyDirectiveAttribute, "");
                templatedBodyRowElement.attr("ng-click", "toggleItemSelection(gridItem, $event)");
                // when server-side get is active (scope.gridOptions.onDataRequired), the filtering through the standard filters should be disabled
                /*if (this.gridOptions.onDataRequired) {
                templatedBodyRowElement.attr("ng-repeat", "gridItem in gridOptions.items");
            }
            else {
                templatedBodyRowElement.attr("ng-repeat", "gridItem in gridOptions.items | filter:gridOptions.filterBy | filter:gridOptions.filterByFields | orderBy:gridOptions.orderBy:gridOptions.orderByReverse | " + dataPagingFilter + ":gridOptions");
            }*/
                templatedBodyRowElement.attr("ng-repeat", "gridDisplayItem in filteredItems");
                templatedBodyRowElement.attr("ng-init", "gridItem=gridDisplayItem.$$_gridItem");
                templatedBodyRowElement.attr("ng-class", "{'" + TrNgGrid.rowSelectedCssClass + "':gridOptions.selectedItems.indexOf(gridItem)>=0}");
                headerElement.replaceWith(this.$compile(headerElement)(scope));
                footerElement.replaceWith(this.$compile(footerElement)(scope));
                bodyElement.replaceWith(this.$compile(bodyElement)(scope));
                if (oldScope) {
                    // an Angular bug is preventing us to destroy a scope inside the digest cycle
                    this.$timeout(function () { return oldScope.$destroy(); });
                }
            }
            catch (ex) {
                TrNgGrid.debugMode && this.log("Fixing table structure failed with error " + ex);
            }
        };
        GridController.prototype.computeFormattedItems = function (scope) {
            var input = scope.gridOptions.items || [];
            TrNgGrid.debugMode && this.log("formatting items of length " + input.length);
            var formattedItems = scope.formattedItems = (scope.formattedItems || []);
            // it's enough to flip the value of the trigger
            scope.requiresReFilteringTrigger = !scope.requiresReFilteringTrigger;
            var gridColumnDefs = scope.gridOptions.gridColumnDefs;
            for (var inputIndex = 0; inputIndex < input.length; inputIndex++) {
                var gridItem = input[inputIndex];
                var outputItem;
                // crate a temporary scope for holding a gridItem as we enumerate through the items
                var localEvalVars = { gridItem: gridItem };
                while (formattedItems.length > input.length && (outputItem = formattedItems[inputIndex]).$$_gridItem !== gridItem) {
                    formattedItems.splice(inputIndex, 1);
                }
                if (inputIndex < formattedItems.length) {
                    outputItem = formattedItems[inputIndex];
                    if (outputItem.$$_gridItem !== gridItem) {
                        outputItem = { $$_gridItem: gridItem };
                        formattedItems[inputIndex] = outputItem;
                    }
                }
                else {
                    outputItem = { $$_gridItem: gridItem };
                    formattedItems.push(outputItem);
                }
                for (var gridColumnDefIndex = 0; gridColumnDefIndex < gridColumnDefs.length; gridColumnDefIndex++) {
                    var fieldName;
                    try {
                        var gridColumnDef = gridColumnDefs[gridColumnDefIndex];
                        if (gridColumnDef.displayFieldName && gridColumnDef.fieldExtractionExpression) {
                            var displayFormat = gridColumnDef.displayFormat;
                            if (displayFormat) {
                                if (displayFormat[0] !== "." && displayFormat[0] !== "|" && displayFormat[0] !== "[") {
                                    // angular filter
                                    displayFormat = " | " + displayFormat;
                                }
                            }
                            outputItem[gridColumnDef.displayFieldName] = scope.$eval("gridItem" + gridColumnDef.fieldExtractionExpression + (displayFormat || ""), localEvalVars);
                        }
                    }
                    catch (ex) {
                        TrNgGrid.debugMode && this.log("Field evaluation failed for <" + (fieldName || "unknown") + "> with error " + ex);
                    }
                }
            }
            // remove any extra elements from the formatted list
            if (formattedItems.length > input.length) {
                formattedItems.splice(input.length, formattedItems.length - input.length);
            }
        };
        GridController.prototype.extractDataItems = function (formattedItems) {
            // copy speed tests: https://jsperf.com/copy-loop-vs-array-slice/13
            var dataItems;
            if (formattedItems) {
                dataItems = new Array(formattedItems.length);
                for (var index = 0; index < formattedItems.length; index++) {
                    dataItems[index] = formattedItems[index].$$_gridItem;
                }
            }
            else {
                dataItems = [];
            }
            return dataItems;
        };
        GridController.prototype.computeFilteredItems = function (scope) {
            if (scope.gridOptions.onDataRequired) {
                // when server side data queries are active, bypass filtering and paging
                scope.filteredItems = scope.formattedItems;
            }
            else {
                // apply filters first
                scope.filterByDisplayFields = {};
                if (scope.gridOptions.filterByFields) {
                    for (var fieldName in scope.gridOptions.filterByFields) {
                        scope.filterByDisplayFields[this.getSafeFieldName(fieldName)] = scope.gridOptions.filterByFields[fieldName];
                    }
                }
                TrNgGrid.debugMode && this.log("filtering items of length " + (scope.formattedItems ? scope.formattedItems.length : 0));
                scope.filteredItems = scope.$eval("formattedItems | filter:gridOptions.filterBy | filter:filterByDisplayFields | " + TrNgGrid.sortFilter + ":gridOptions");
                // check if anyone is interested in the filtered items
                if (scope.gridOptions.filteredItems) {
                    scope.gridOptions.filteredItems = this.extractDataItems(scope.filteredItems);
                }
                // proceed with paging
                scope.filteredItems = scope.$eval("filteredItems | " + TrNgGrid.dataPagingFilter + ":gridOptions");
            }
            // check if anyone is interested in the items on the current page
            if (scope.gridOptions.filteredItemsPage) {
                scope.gridOptions.filteredItemsPage = this.extractDataItems(scope.filteredItems);
            }
        };
        GridController.prototype.setupDisplayItemsArray = function (scope) {
            var _this = this;
            var watchExpression = "[gridOptions.items,gridOptions.gridColumnDefs.length";
            angular.forEach(scope.gridOptions.gridColumnDefs, function (gridColumnDef) {
                if (gridColumnDef.displayFormat && gridColumnDef.displayFormat[0] != '.') {
                    // watch the parameters
                    var displayfilters = gridColumnDef.displayFormat.split('|');
                    angular.forEach(displayfilters, function (displayFilter) {
                        var displayFilterParams = displayFilter.split(':');
                        if (displayFilterParams.length > 1) {
                            angular.forEach(displayFilterParams.slice(1), function (displayFilterParam) {
                                displayFilterParam = displayFilterParam.trim();
                                if (displayFilterParam && displayFilterParam !== "gridItem" && displayFilterParam !== "gridDisplayItem") {
                                    watchExpression += "," + displayFilterParam;
                                }
                            });
                        }
                    });
                }
            });
            watchExpression += "]";
            TrNgGrid.debugMode && this.log("re-formatting is set to watch for changes in " + watchExpression);
            scope.$watch(watchExpression, function () { return _this.computeFormattedItems(scope); }, true);
            watchExpression = "[requiresReFilteringTrigger";
            if (!scope.gridOptions.onDataRequired) {
                watchExpression += ", gridOptions.filterBy, gridOptions.filterByFields, gridOptions.orderBy, gridOptions.orderByReverse, gridOptions.currentPage, gridOptions.pageItems";
            }
            watchExpression += "]";
            scope.$watch(watchExpression, function (newValue, oldValue) {
                _this.computeFilteredItems(scope);
            }, true);
        };
        GridController.prototype.linkAttrs = function (tAttrs, localStorage) {
            var propSetter = function (propName, propValue) {
                if (typeof (propValue) === "undefined")
                    return;
                switch (propValue) {
                    case "true":
                        propValue = true;
                        break;
                    case "false":
                        propValue = false;
                        break;
                }
                localStorage[propName] = propValue;
            };
            for (var propName in localStorage) {
                propSetter(propName, tAttrs[propName]);
                // watch for changes
                (function (propName) {
                    tAttrs.$observe(propName, function (value) { return propSetter(propName, value); });
                })(propName);
            }
        };
        GridController.prototype.linkScope = function (internalScope, externalScope, scopeTargetIdentifier, attrs) {
            // this method shouldn't even be here
            // but it is because we want to allow people to either set attributes with either a constant or a watchable variable
            var _this = this;
            // watch for a resolution to issue #5951 on angular
            // https://github.com/angular/angular.js/issues/5951
            var target = internalScope[scopeTargetIdentifier];
            for (var propName in target) {
                var attributeExists = typeof (attrs[propName]) != "undefined" && attrs[propName] != null;
                if (attributeExists) {
                    var isArray = false;
                    // initialise from the scope first
                    if (typeof (externalScope[propName]) != "undefined" && externalScope[propName] != null) {
                        target[propName] = externalScope[propName];
                        isArray = target[propName] instanceof Array;
                    }
                    //allow arrays to be changed: if(!isArray){
                    var compiledAttrGetter = null;
                    try {
                        compiledAttrGetter = this.$parse(attrs[propName]);
                    }
                    catch (ex) {
                    }
                    (function (propName, compiledAttrGetter) {
                        if (!compiledAttrGetter || !compiledAttrGetter.constant) {
                            // watch for a change in value and set it on our internal scope
                            externalScope.$watch(propName, function (newValue, oldValue) {
                                // debugMode && this.log("Property '" + propName + "' changed on the external scope from " + oldValue + " to " + newValue + ". Mirroring the parameter's value on the grid's internal scope.");
                                target[propName] = newValue;
                            });
                        }
                        var compiledAttrSetter = (compiledAttrGetter && compiledAttrGetter.assign) ? compiledAttrGetter.assign : null;
                        if (compiledAttrSetter) {
                            // a setter exists for the property, which means it's safe to mirror the internal prop on the external scope
                            internalScope.$watch(scopeTargetIdentifier + "." + propName, function (newValue, oldValue) {
                                try {
                                    // debugMode && this.log("Property '" + propName + "' changed on the internal scope from " + oldValue + " to " + newValue + ". Mirroring the parameter's value on the external scope.");
                                    externalScope[propName] = newValue;
                                }
                                catch (ex) {
                                    TrNgGrid.debugMode && _this.log("Mirroring the property on the external scope failed with " + ex);
                                }
                            });
                        }
                    })(propName, compiledAttrGetter);
                }
            }
        };
        GridController.prototype.log = function (message) {
            console.log(tableDirective + "(" + new Date().getTime() + "): " + message);
        };
        return GridController;
    })();
    angular.module("trNgGrid", []).directive(tableDirective, [
        function () {
            return {
                restrict: 'A',
                scope: {
                    items: '=',
                    selectedItems: '=?',
                    filteredItems: '=?',
                    filteredItemsPage: '=?',
                    filterBy: '=?',
                    filterByFields: '=?',
                    orderBy: '=?',
                    orderByReverse: '=?',
                    pageItems: '=?',
                    currentPage: '=?',
                    totalItems: '=?',
                    enableFiltering: '=?',
                    enableSorting: '=?',
                    enableSelections: '=?',
                    enableMultiRowSelections: '=?',
                    selectionMode: '@',
                    locale: '@',
                    onDataRequired: '&',
                    onDataRequiredDelay: '=?',
                    fields: '=?'
                },
                template: function (templateElement, tAttrs) {
                    templateElement.addClass(TrNgGrid.tableCssClass);
                    // at this stage, no elements can be bound
                    angular.forEach(templateElement.children(), function (childElement) {
                        childElement = angular.element(childElement);
                        childElement.attr("ng-non-bindable", "");
                    });
                },
                controller: ["$compile", "$parse", "$timeout", "$templateCache", GridController],
                compile: function (templateElement, tAttrs) {
                    return {
                        pre: function (isolatedScope, instanceElement, tAttrs, controller, transcludeFn) {
                            controller.discoverTemplates(instanceElement);
                        },
                        post: function (isolatedScope, instanceElement, tAttrs, controller, transcludeFn) {
                            var gridScope = controller.setupScope(isolatedScope, instanceElement, tAttrs);
                            gridScope.speedUpAsyncDataRetrieval = function ($event) { return controller.speedUpAsyncDataRetrieval($event); };
                            controller.configureTableStructure(gridScope, instanceElement);
                            controller.setupDisplayItemsArray(gridScope);
                        }
                    };
                }
            };
        }
    ]).directive(cellHeaderDirective, [
        function () {
            var setupColumnTitle = function (scope) {
                if (scope.columnOptions.displayName) {
                    scope.columnTitle = scope.columnOptions.displayName;
                }
                else if (scope.columnOptions.fieldName) {
                    // exclude nested notations and invalid letters
                    var rawTitle = scope.columnOptions.fieldName.replace(/^([^\a-zA-Z]*)([\a-zA-Z]*)(.*)/g, "$2"); // take just the first part
                    // split by camel-casing
                    var splitTitleName = rawTitle.split(/(?=[A-Z])/);
                    if (splitTitleName.length && splitTitleName[0].length) {
                        splitTitleName[0] = splitTitleName[0][0].toLocaleUpperCase() + splitTitleName[0].substr(1);
                    }
                    scope.columnTitle = splitTitleName.join(" ");
                }
                else {
                    scope.columnTitle = "";
                }
            };
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                scope: true,
                compile: function (templateElement, tAttrs) {
                    var isCustomized = tAttrs['isCustomized'] == 'true';
                    wrapTemplatedCell(templateElement, tAttrs, isCustomized, cellHeaderTemplateDirectiveAttribute);
                    return {
                        // we receive a reference to a real element that will appear in the DOM, after the controller was created, but before binding setup
                        pre: function (scope, instanceElement, tAttrs, controller, $transclude) {
                            // we're not interested in creating an isolated scope just to parse the element attributes,
                            // so we're gonna have to do this manually
                            var columnIndex = parseInt(tAttrs[cellHeaderDirective]);
                            // create a clone of the default column options
                            var columnOptions = angular.extend(scope.gridOptions.gridColumnDefs[columnIndex], TrNgGrid.defaultColumnOptions);
                            // now match and observe the attributes
                            controller.linkAttrs(tAttrs, columnOptions);
                            // set up the new scope
                            scope.columnOptions = columnOptions;
                            scope.isCustomized = isCustomized;
                            scope.toggleSorting = function (propertyName) {
                                controller.toggleSorting(propertyName);
                            };
                            // set up the column title
                            setupColumnTitle(scope);
                            scope.$watch("columnOptions.filter", function (newValue, oldValue) {
                                if (newValue !== oldValue) {
                                    controller.setFilter(columnOptions.fieldName, newValue);
                                }
                            });
                        }
                    };
                }
            };
        }
    ]).directive(cellHeaderTemplateDirective, [
        function () {
            return {
                restrict: 'A',
                templateUrl: TrNgGrid.cellHeaderTemplateId,
                transclude: true,
                replace: true,
            };
        }
    ]).directive(bodyDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                scope: true,
                compile: function (templateElement, tAttrs) {
                    return {
                        pre: function (scope, compiledInstanceElement, tAttrs, controller) {
                            scope.toggleItemSelection = function (item, $event) {
                                controller.toggleItemSelection(scope.filteredItems, item, $event);
                            };
                        }
                    };
                }
            };
        }
    ]).directive(cellBodyDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                scope: true,
                compile: function (templateElement, tAttrs) {
                    var isCustomized = tAttrs['isCustomized'] == 'true';
                    wrapTemplatedCell(templateElement, tAttrs, isCustomized, cellBodyTemplateDirectiveAttribute);
                    return {
                        pre: function (scope, instanceElement, tAttrs, controller, $transclude) {
                            scope.columnOptions = scope.gridOptions.gridColumnDefs[parseInt(tAttrs[cellBodyDirective])];
                            scope.gridItem = scope.gridDisplayItem.$$_gridItem;
                            scope.isCustomized = isCustomized;
                        }
                    };
                }
            };
        }
    ]).directive(cellBodyTemplateDirective, [
        function () {
            return {
                restrict: 'A',
                templateUrl: TrNgGrid.cellBodyTemplateId,
                transclude: true,
                replace: true
            };
        }
    ]).directive(cellFooterDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                scope: true,
                compile: function (templateElement, tAttrs) {
                    var isCustomized = tAttrs['isCustomized'] == 'true';
                    wrapTemplatedCell(templateElement, tAttrs, isCustomized, cellFooterTemplateDirectiveAttribute);
                    return {
                        pre: function (scope, instanceElement, tAttrs, controller, $transclude) {
                            scope.isCustomized = isCustomized;
                            instanceElement.attr("colspan", scope.gridOptions.gridColumnDefs.length);
                        }
                    };
                }
            };
        }
    ]).directive(cellFooterTemplateDirective, [
        function () {
            return {
                restrict: 'A',
                templateUrl: TrNgGrid.cellFooterTemplateId,
                transclude: true,
                replace: true
            };
        }
    ]).directive(columnSortDirective, [
        function () {
            return {
                restrict: 'A',
                replace: true,
                templateUrl: TrNgGrid.columnSortTemplateId
            };
        }
    ]).directive(columnFilterDirective, [
        function () {
            return {
                restrict: 'A',
                replace: true,
                templateUrl: TrNgGrid.columnFilterTemplateId
            };
        }
    ]).directive(globalFilterDirective, [
        function () {
            return {
                restrict: 'A',
                scope: false,
                templateUrl: TrNgGrid.footerGlobalFilterTemplateId,
            };
        }
    ]).directive(pagerDirective, [
        function () {
            var setupScope = function (scope, controller) {
                // do not set scope.gridOptions.totalItems, it might be set from the outside
                scope.totalItemsCount = (typeof (scope.gridOptions.totalItems) != "undefined" && scope.gridOptions.totalItems != null) ? scope.gridOptions.totalItems : (scope.gridOptions.items ? scope.gridOptions.items.length : 0);
                scope.isPaged = (!!scope.gridOptions.pageItems) && (scope.gridOptions.pageItems < scope.totalItemsCount);
                scope.extendedControlsActive = false;
                scope.lastPageIndex = (!scope.totalItemsCount || !scope.isPaged) ? 0 : (Math.floor(scope.totalItemsCount / scope.gridOptions.pageItems) + ((scope.totalItemsCount % scope.gridOptions.pageItems) ? 0 : -1));
                if (scope.gridOptions.currentPage > scope.lastPageIndex) {
                    // this will unfortunately trigger another query if in server side data query mode
                    scope.gridOptions.currentPage = scope.lastPageIndex;
                }
                scope.startItemIndex = scope.isPaged ? (scope.gridOptions.pageItems * scope.gridOptions.currentPage) : 0;
                scope.endItemIndex = scope.isPaged ? (scope.startItemIndex + scope.gridOptions.pageItems - 1) : scope.totalItemsCount - 1;
                if (scope.endItemIndex >= scope.totalItemsCount) {
                    scope.endItemIndex = scope.totalItemsCount - 1;
                }
                if (scope.endItemIndex < scope.startItemIndex) {
                    scope.endItemIndex = scope.startItemIndex;
                }
                scope.pageCanGoBack = scope.isPaged && scope.gridOptions.currentPage > 0;
                scope.pageCanGoForward = scope.isPaged && scope.gridOptions.currentPage < scope.lastPageIndex;
                scope.pageIndexes = scope.pageIndexes || [];
                scope.pageIndexes.splice(0);
                if (scope.isPaged) {
                    if (scope.lastPageIndex + 1 > TrNgGrid.defaultPagerMinifiedPageCountThreshold) {
                        scope.extendedControlsActive = true;
                        var pageIndexHalfRange = Math.floor(TrNgGrid.defaultPagerMinifiedPageCountThreshold / 2);
                        var lowPageIndex = scope.gridOptions.currentPage - pageIndexHalfRange;
                        var highPageIndex = scope.gridOptions.currentPage + pageIndexHalfRange;
                        // compute the high and low
                        if (lowPageIndex < 0) {
                            highPageIndex += -lowPageIndex;
                            lowPageIndex = 0;
                        }
                        else if (highPageIndex > scope.lastPageIndex) {
                            lowPageIndex -= highPageIndex - scope.lastPageIndex;
                            highPageIndex = scope.lastPageIndex;
                        }
                        // add the extra controls where needed
                        if (lowPageIndex > 0) {
                            scope.pageIndexes.push(null);
                            lowPageIndex++;
                        }
                        var highPageEllipsed = false;
                        if (highPageIndex < scope.lastPageIndex) {
                            highPageEllipsed = true;
                            highPageIndex--;
                        }
                        for (var pageIndex = lowPageIndex; pageIndex <= highPageIndex; pageIndex++) {
                            scope.pageIndexes.push(pageIndex);
                        }
                        if (highPageEllipsed) {
                            scope.pageIndexes.push(null);
                        }
                    }
                    else {
                        scope.extendedControlsActive = false;
                        for (var pageIndex = 0; pageIndex <= scope.lastPageIndex; pageIndex++) {
                            scope.pageIndexes.push(pageIndex);
                        }
                    }
                }
                scope.pageSelectionActive = scope.pageIndexes.length > 1;
                scope.navigateToPage = function (pageIndex) {
                    scope.gridOptions.currentPage = pageIndex;
                    scope.speedUpAsyncDataRetrieval();
                    /*$event.preventDefault();
                    $event.stopPropagation();*/
                };
                scope.switchPageSelection = function ($event, pageSelectionActive) {
                    scope.pageSelectionActive = pageSelectionActive;
                    if ($event) {
                        $event.preventDefault();
                        $event.stopPropagation();
                    }
                };
            };
            //ng - model = "gridOptions.currentPage" 
            return {
                restrict: 'A',
                scope: true,
                require: '^' + tableDirective,
                templateUrl: TrNgGrid.footerPagerTemplateId,
                replace: true,
                compile: function (templateElement, tAttrs) {
                    return {
                        pre: function (scope, compiledInstanceElement, tAttrs, controller) {
                            setupScope(scope, controller);
                        },
                        post: function (scope, instanceElement, tAttrs, controller) {
                            scope.$watchCollection("[gridOptions.currentPage, gridOptions.items.length, gridOptions.totalItems, gridOptions.pageItems]", function (newValues, oldValues) {
                                setupScope(scope, controller);
                            });
                        }
                    };
                }
            };
        }
    ]).filter(TrNgGrid.sortFilter, ["$filter", "$parse", function ($filter, $parse) {
        return function (input, gridOptions) {
            if (!gridOptions.orderBy || !gridOptions.gridColumnDefs) {
                // not ready to sort, return the input array
                return input;
            }
            // we'll need the column options
            var columnOptions = null;
            for (var columnOptionsIndex = 0; (columnOptionsIndex < gridOptions.gridColumnDefs.length) && ((columnOptions = gridOptions.gridColumnDefs[columnOptionsIndex]).fieldName !== gridOptions.orderBy); columnOptions = null, columnOptionsIndex++)
                ;
            if (!columnOptions) {
                // unable to find any info about the selected field
                return input;
            }
            var sortedInput = $filter("orderBy")(input, function (item) {
                var fieldValue = undefined;
                if (columnOptions.fieldExtractionExpression) {
                    try {
                        // get the value associated with the original grid item
                        fieldValue = $parse("item.$$_gridItem" + columnOptions.fieldExtractionExpression)({ item: item });
                    }
                    catch (ex) {
                    }
                }
                if (fieldValue === undefined) {
                    try {
                        // next try the field on the display item, in case of computed fields
                        fieldValue = $parse("item[\"" + columnOptions.displayFieldName + "\"]")({ item: item });
                    }
                    catch (ex) {
                    }
                }
                return fieldValue;
            }, gridOptions.orderByReverse);
            return sortedInput;
        };
    }]).filter(TrNgGrid.dataPagingFilter, function () {
        // when server-side logic is enabled, this directive should not be used!
        return function (input, gridOptions) {
            //currentPage?:number, pageItems?:number
            if (input)
                gridOptions.totalItems = input.length;
            if (!gridOptions.pageItems || !input || input.length == 0)
                return input;
            if (!gridOptions.currentPage) {
                gridOptions.currentPage = 0;
            }
            var startIndex = gridOptions.currentPage * gridOptions.pageItems;
            if (startIndex >= input.length) {
                gridOptions.currentPage = 0;
                startIndex = 0;
            }
            var endIndex = gridOptions.currentPage * gridOptions.pageItems + gridOptions.pageItems;
            return input.slice(startIndex, endIndex);
        };
    }).filter(TrNgGrid.translateFilter, ["$filter", "$injector", function ($filter, $injector) {
        return function (input, languageId) {
            var translatedText = null;
            // dates require special attention
            if (input instanceof Date) {
                // we're dealing with a date object, see if we have a localized format for it
                var dateFormat = $filter(TrNgGrid.translateFilter)(TrNgGrid.translationDateFormat, languageId);
                if (dateFormat && dateFormat !== TrNgGrid.translationDateFormat) {
                    // call the date filter
                    translatedText = $filter("date")(input, dateFormat);
                    return translatedText;
                }
                return input;
            }
            var languageIdParts = languageId.split(/[-_]/);
            for (var languageIdPartIndex = languageIdParts.length; (languageIdPartIndex > 0) && (!translatedText); languageIdPartIndex--) {
                var subLanguageId = languageIdParts.slice(0, languageIdPartIndex).join("-");
                var langTranslations = TrNgGrid.translations[subLanguageId];
                if (langTranslations) {
                    translatedText = langTranslations[input];
                }
            }
            // check for a filter directive
            if (!translatedText && $injector.has("translateFilter")) {
                try {
                    translatedText = $filter("translate")(input);
                }
                catch (ex) {
                }
            }
            if (!translatedText) {
                translatedText = input;
            }
            return translatedText;
        };
    }]).run(function () {
        TrNgGrid.tableCssClass = "tr-ng-grid table table-bordered table-hover"; // at the time of coding, table-striped is not working properly with selection
        TrNgGrid.cellCssClass = "tr-ng-cell";
        TrNgGrid.headerCellCssClass = "tr-ng-column-header " + TrNgGrid.cellCssClass;
        TrNgGrid.bodyCellCssClass = TrNgGrid.cellCssClass;
        TrNgGrid.columnTitleCssClass = "tr-ng-title";
        TrNgGrid.columnSortCssClass = "tr-ng-sort";
        TrNgGrid.columnFilterCssClass = "tr-ng-column-filter";
        TrNgGrid.columnFilterInputWrapperCssClass = "";
        TrNgGrid.columnSortActiveCssClass = "tr-ng-sort-active text-info";
        TrNgGrid.columnSortInactiveCssClass = "tr-ng-sort-inactive text-muted glyphicon glyphicon-chevron-down";
        TrNgGrid.columnSortReverseOrderCssClass = "tr-ng-sort-order-reverse glyphicon glyphicon-chevron-down";
        TrNgGrid.columnSortNormalOrderCssClass = "tr-ng-sort-order-normal glyphicon glyphicon-chevron-up";
        TrNgGrid.rowSelectedCssClass = "active";
        TrNgGrid.footerCssClass = "tr-ng-grid-footer form-inline";
    }).run(function () {
        TrNgGrid.defaultColumnOptions.displayAlign = 'left';
        TrNgGrid.defaultPagerMinifiedPageCountThreshold = 3;
    });
    function configureTemplates($templateCache) {
        // set up default templates
        if (!$templateCache.get(TrNgGrid.cellHeaderTemplateId)) {
            $templateCache.put(TrNgGrid.cellHeaderTemplateId, '<div class="' + TrNgGrid.headerCellCssClass + '" ng-switch="isCustomized">' + '  <div ng-switch-when="true">' + '    <div ng-transclude=""></div>' + '  </div>' + '  <div ng-switch-default>' + '    <div class="' + TrNgGrid.columnTitleCssClass + '">' + '      {{columnTitle |' + TrNgGrid.translateFilter + ':gridOptions.locale}}' + '       <div ' + TrNgGrid.columnSortDirectiveAttribute + '=""></div>' + '    </div>' + '    <div ' + TrNgGrid.columnFilterDirectiveAttribute + '=""></div>' + '  </div>' + '</div>');
        }
        if (!$templateCache.get(TrNgGrid.cellBodyTemplateId)) {
            $templateCache.put(TrNgGrid.cellBodyTemplateId, '<div ng-attr-class="' + TrNgGrid.bodyCellCssClass + ' text-{{columnOptions.displayAlign}}" ng-switch="isCustomized">' + '  <div ng-switch-when="true">' + '    <div ng-transclude=""></div>' + '  </div>' + '  <div ng-switch-default>{{gridDisplayItem[columnOptions.displayFieldName]}}</div>' + '</div>');
        }
        if (!$templateCache.get(TrNgGrid.columnFilterTemplateId)) {
            $templateCache.put(TrNgGrid.columnFilterTemplateId, '<div ng-show="(gridOptions.enableFiltering&&columnOptions.enableFiltering!==false)||columnOptions.enableFiltering" class="' + TrNgGrid.columnFilterCssClass + '">' + ' <div class="' + TrNgGrid.columnFilterInputWrapperCssClass + '">' + '   <input class="form-control input-sm" type="text" ng-model="columnOptions.filter" ng-keypress="speedUpAsyncDataRetrieval($event)"></input>' + ' </div>' + '</div>');
        }
        if (!$templateCache.get(TrNgGrid.columnSortTemplateId)) {
            $templateCache.put(TrNgGrid.columnSortTemplateId, '<div ng-attr-title="{{\'Sort\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}"' + ' ng-show="(gridOptions.enableSorting&&columnOptions.enableSorting!==false)||columnOptions.enableSorting"' + ' ng-click="toggleSorting(columnOptions.fieldName)"' + ' class="' + TrNgGrid.columnSortCssClass + '" > ' + '  <div ng-class="{\'' + TrNgGrid.columnSortActiveCssClass + '\':gridOptions.orderBy==columnOptions.fieldName,\'' + TrNgGrid.columnSortInactiveCssClass + '\':gridOptions.orderBy!=columnOptions.fieldName,\'' + TrNgGrid.columnSortNormalOrderCssClass + '\':gridOptions.orderBy==columnOptions.fieldName&&!gridOptions.orderByReverse,\'' + TrNgGrid.columnSortReverseOrderCssClass + '\':gridOptions.orderBy==columnOptions.fieldName&&gridOptions.orderByReverse}" >' + '  </div>' + '</div>');
        }
        if (!$templateCache.put(TrNgGrid.cellFooterTemplateId)) {
            $templateCache.put(TrNgGrid.cellFooterTemplateId, '<div class="' + TrNgGrid.footerCssClass + '" ng-switch="isCustomized">' + '  <div ng-switch-when="true">' + '    <div ng-transclude=""></div>' + '  </div>' + '  <div ng-switch-default>' + '    <span ' + TrNgGrid.globalFilterDirectiveAttribute + '=""></span>' + '    <span ' + TrNgGrid.pagerDirectiveAttribute + '=""></span>' + '  </div>' + '</div>');
        }
        if (!$templateCache.get(TrNgGrid.footerGlobalFilterTemplateId)) {
            $templateCache.put(TrNgGrid.footerGlobalFilterTemplateId, '<span ng-show="gridOptions.enableFiltering" class="pull-left form-group">' + '  <input class="form-control" type="text" ng-model="gridOptions.filterBy" ng-keypress="speedUpAsyncDataRetrieval($event)" ng-attr-placeholder="{{\'Search\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}"></input>' + '</span>');
        }
        if (!$templateCache.get(TrNgGrid.footerPagerTemplateId)) {
            $templateCache.put(TrNgGrid.footerPagerTemplateId, '<span class="pull-right form-group">' + ' <ul class="pagination">' + '   <li ng-class="{disabled:!pageCanGoBack}" ng-if="extendedControlsActive">' + '     <a href="" ng-click="pageCanGoBack&&navigateToPage(0)" ng-attr-title="{{\'First Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">' + '         <span>&laquo;</span>' + '     </a>' + '   </li>' + '   <li ng-class="{disabled:!pageCanGoBack}" ng-if="extendedControlsActive">' + '     <a href="" ng-click="pageCanGoBack&&navigateToPage(gridOptions.currentPage - 1)" ng-attr-title="{{\'Previous Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">' + '         <span>&lsaquo;</span>' + '     </a>' + '   </li>' + '   <li ng-if="pageSelectionActive" ng-repeat="pageIndex in pageIndexes track by $index" ng-class="{disabled:pageIndex===null, active:pageIndex===gridOptions.currentPage}">' + '      <span ng-if="pageIndex===null">...</span>' + '      <a href="" ng-click="navigateToPage(pageIndex)" ng-if="pageIndex!==null" ng-attr-title="{{\'Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">{{pageIndex+1}}</a>' + '   </li>' + '   <li ng-class="{disabled:!pageCanGoForward}" ng-if="extendedControlsActive">' + '     <a href="" ng-click="pageCanGoForward&&navigateToPage(gridOptions.currentPage + 1)" ng-attr-title="{{\'Next Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">' + '         <span>&rsaquo;</span>' + '     </a>' + '   </li>' + '   <li ng-class="{disabled:!pageCanGoForward}" ng-if="extendedControlsActive">' + '     <a href="" ng-click="pageCanGoForward&&navigateToPage(lastPageIndex)" ng-attr-title="{{\'Last Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">' + '         <span>&raquo;</span>' + '     </a>' + '   </li>' + '   <li class="disabled" style="white-space: nowrap;">' + '     <span ng-hide="totalItemsCount">{{\'No items to display\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}</span>' + '     <span ng-show="totalItemsCount">' + '       {{startItemIndex+1}} - {{endItemIndex+1}} {{\'displayed\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}' + '       <span>, {{totalItemsCount}} {{\'in total\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}</span>' + '     </span > ' + '   </li>' + ' </ul>' + '</span>');
        }
    }
})(TrNgGrid || (TrNgGrid = {}));

